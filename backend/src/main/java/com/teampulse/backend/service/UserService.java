package com.teampulse.backend.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.teampulse.backend.dto.request.*;
import com.teampulse.backend.dto.response.AuthResponse;
import com.teampulse.backend.dto.response.UserResponse;
import com.teampulse.backend.enums.AuthProvider;
import com.teampulse.backend.enums.WorkspaceMemberRole;
import com.teampulse.backend.event.UserWelcomeEvent;
import com.teampulse.backend.exception.*;
import com.teampulse.backend.mapper.UserMapper;
import com.teampulse.backend.model.*;
import com.teampulse.backend.repository.*;
import com.teampulse.backend.security.JwtUtils;
import com.teampulse.backend.security.UserPrincipal;
import com.teampulse.backend.security.utils.ClientIpUtils;
import com.teampulse.backend.security.utils.EmailUtils;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtUtils jwtUtils;
	private final RefreshTokenService refreshTokenService;
	private final AuthenticationManager authenticationManager;
	private final PasswordResetTokenRepository passwordResetTokenRepository;
	private final VerificationService verificationService;
	private final EmailService emailService;
	private final UserMapper userMapper;
	private final FileStorageService fileStorageService;
	private final ApplicationEventPublisher eventPublisher;
	private final TaskRepository taskRepository;
	private final WorkspaceMemberRepository workspaceMemberRepository;
	private final WorkspaceRepository workspaceRepository;
	private final WorkspaceInvitationRepository workspaceInvitationRepository;
	private final RefreshTokenRepository refreshTokenRepository;
	private final ApiKeyRepository apiKeyRepository;
	private final NotificationRepository notificationRepository;
	private final HttpServletRequest httpServletRequest;
	private final VerificationCodeRepository verificationCodeRepository;


	@Value("${app.frontend-url}")
	private String frontendUrl;

	@Value("${spring.security.oauth2.client.registration.google.client-id}")
	private String googleClientId;

	private GoogleIdTokenVerifier googleIdTokenVerifier;

	@PostConstruct
	public void initGoogleVerifier() {
		this.googleIdTokenVerifier = new GoogleIdTokenVerifier.Builder(
				new NetHttpTransport(),
				GsonFactory.getDefaultInstance())
				.setAudience(Collections.singletonList(googleClientId))
				.build();
	}

	private static final List<String> ALLOWED_CONTENT_TYPES = List.of(
			"image/jpeg",
			"image/png",
			"image/webp"
	);
	private static final List<String> ALLOWED_EXTENSIONS = List.of(
			".jpg",
			".jpeg",
			".png",
			".webp"
	);
	private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

	@Transactional
	public String signup(SignupRequest request) {
		String cleanEmail = EmailUtils.normalize(request.getEmail());

		if (userRepository.findByEmail(cleanEmail).isPresent())
			throw new ResourceAlreadyExistsException("Email '" + cleanEmail + "' is already registered!");

		User user = new User();
		user.setEmail(cleanEmail);
		user.setPasswordHashed(passwordEncoder.encode(request.getPassword()));
		user.setFirstName(request.getFirstName() != null ? request.getFirstName().trim() : null);
		user.setLastName(request.getLastName() != null ? request.getLastName().trim() : null);
		user.setEnabled(false);

		User savedUser = userRepository.save(user);

		verificationService.generateAndSendCodeForUser(savedUser);

		return "Verification code has been sent to your email.";
	}

	@Transactional
	public AuthResponse verifyEmail(VerifyEmailRequest request) {
		String cleanEmail = EmailUtils.normalize(request.getEmail());

		User user = userRepository.findByEmail(cleanEmail)
				.orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + cleanEmail));

		verificationService.validateAndConsumeCode(user, request.getCode());

		user.setEnabled(true);
		userRepository.save(user);

		eventPublisher.publishEvent(new UserWelcomeEvent(this, user.getId(), user.getEmail(), user.getFirstName()));

		UserPrincipal userPrincipal = new UserPrincipal(user);

		String accessToken = jwtUtils.generateToken(userPrincipal);
		RefreshToken refreshToken = refreshTokenService.createRefreshToken(user,
				ClientIpUtils.getClientIp(httpServletRequest), getUserAgent());

		return AuthResponse.builder()
				.accessToken(accessToken)
				.refreshToken(refreshToken.getToken())
				.user(userMapper.toResponse(user))
				.build();
	}

	@Transactional
	public void resendVerificationCode(ResendVerificationRequest request) {
		verificationService.genrateAndSendCodeInNewTrasactional(EmailUtils.normalize(request.getEmail()));
	}

	@Transactional
	public AuthResponse login(LoginRequest request) {
		String cleanEmail = EmailUtils.normalize(request.getEmail());

		try {
			Authentication authentication = authenticationManager.authenticate(
					new UsernamePasswordAuthenticationToken(cleanEmail, request.getPassword()));

			UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
			User user = userPrincipal.getUser();

			String accessToken = jwtUtils.generateToken(userPrincipal);

			refreshTokenService.deleteByUserId(user);
			RefreshToken refreshToken = refreshTokenService.createRefreshToken(
					user, ClientIpUtils.getClientIp(httpServletRequest), getUserAgent());

			return AuthResponse.builder()
					.accessToken(accessToken)
					.refreshToken(refreshToken.getToken())
					.user(userMapper.toResponse(user))
					.build();

		} catch (DisabledException ex) {
			User user = userRepository.findByEmail(cleanEmail).orElse(null);

			if (user != null && user.getPasswordHashed() != null && passwordEncoder.matches(request.getPassword(), user.getPasswordHashed())) {
				try {
					verificationService.genrateAndSendCodeInNewTrasactional(cleanEmail);
				} catch (Exception ignored) {
				}
				throw new AccountNotVerifiedException("Account not yet verified. A new verification code has been sent to your email.");
			}

			throw new UnauthorizedAccessException("Invalid email or password. Please try again.");

		} catch (BadCredentialsException ex) {
			throw new UnauthorizedAccessException("Invalid email or password. Please try again.");
		}
	}

	@Transactional
	public AuthResponse refreshToken(RefreshTokenRequest request) {
		String tokenStr = request.getRefreshToken();

		RefreshToken verifiedToken = refreshTokenService.verifyExpirationAndRevocation(
				tokenStr, ClientIpUtils.getClientIp(httpServletRequest), getUserAgent());
		User user = verifiedToken.getUser();

		refreshTokenService.deleteByToken(tokenStr);
		RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(
				user, ClientIpUtils.getClientIp(httpServletRequest), getUserAgent());

		UserPrincipal userPrincipal = new UserPrincipal(user);
		String newAccessToken = jwtUtils.generateToken(userPrincipal);

		return AuthResponse.builder()
				.accessToken(newAccessToken)
				.refreshToken(newRefreshToken.getToken())
				.user(userMapper.toResponse(user))
				.build();
	}

	@Transactional
	public void logout(String refreshToken) {
		if (refreshToken != null && !refreshToken.isBlank())
			refreshTokenService.deleteByToken(refreshToken);
	}

	@Transactional
	public UserResponse updateProfile(String currentEmail, ProfileUpdateRequest request) {
		User user = userRepository.findByEmail(currentEmail)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		user.setFirstName(request.getFirstName());
		user.setLastName(request.getLastName());

		if (request.getAvatarUrl() != null) {
			String avatarUrl = request.getAvatarUrl().trim();
			if (!avatarUrl.isBlank()) {
				try {
					URI uri = new URI(avatarUrl);
					String scheme = uri.getScheme();
					if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https")))
						throw new BadRequestException("Avatar URL must use HTTP or HTTPS protocol");
				} catch (URISyntaxException e) {
					throw new BadRequestException("Invalid avatar URL format");
				}
				user.setAvatarUrl(avatarUrl);
			} else
				user.setAvatarUrl(null);
		}

		User updateUser = userRepository.save(user);

		return userMapper.toResponse(updateUser);
	}

	@Transactional
	public void changePassword(String currentEmail, PasswordChangeRequest request) {
		User user = userRepository.findByEmail(currentEmail)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHashed()))
			throw new BadRequestException("Current password does not match!");

		if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHashed()))
			throw new BadRequestException("New password cannot be the same as the current password!");

		user.setPasswordHashed(passwordEncoder.encode(request.getNewPassword()));
		userRepository.save(user);

		refreshTokenService.deleteByUserId(user);
	}

	@Transactional(readOnly = true)
	public UserResponse getCurrentUserByEmail(String email) {
		String cleanEmail = EmailUtils.normalize(email);

		if (cleanEmail == null)
			throw new BadRequestException("Email cannot be null");

		User user = userRepository.findByEmail(cleanEmail)
				.orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

		return userMapper.toResponse(user);
	}

	@Transactional(readOnly = true)
	public List<UserResponse> searchUsersByEmail(String email) {
		if (email == null || email.trim().length() < 3)
			return List.of();

		String cleanQuery = EmailUtils.normalize(email);

		List<User> users = userRepository.findTop10ByEmailContainingIgnoreCase(cleanQuery);

		return users.stream().map(userMapper::toResponse).toList();
	}

	@Transactional
	public void processForgotPassword(ForgotPasswordRequest request) {
		log.info("Received password reset request for email: {}", EmailUtils.maskEmail(request.getEmail()));

		String cleanEmail = EmailUtils.normalize(request.getEmail());

		Optional<User> userOptional = userRepository.findByEmail(cleanEmail);
		if (userOptional.isEmpty()) {
			log.warn("Password reset initiated for non-existing email: {}", EmailUtils.maskEmail(request.getEmail()));
			return;
		}

		User user = userOptional.get();

		passwordResetTokenRepository.deleteByUser(user);

		String token = UUID.randomUUID().toString();
		Instant expiryDate = Instant.now().plusSeconds(15 * 60);

		PasswordResetToken resetToken = new PasswordResetToken(token, user, expiryDate);
		passwordResetTokenRepository.save(resetToken);

		String resetLink = frontendUrl + "/reset-password?token=" + token;
		String emailBody = String.format(
				"Hello %s,\n\n" +
						"You requested to reset your password. Please click the link below to set a new one:\n%s\n\n" +
						"This link is secure and will expire in 15 minutes.\n" +
						"If you didn't request this, please ignore this email.\n\n" +
						"Best regards,\nTeamPulse Security Team.",
				user.getFirstName(), resetLink);

		emailService.sendEmail(user.getEmail(), "Reset Your Team-Pulse Password", emailBody);
	}

	@Transactional
	public void processResetPassword(ResetPasswordRequest request) {
		log.info("Attempting to execute password reset via token.");

		PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken())
				.orElseThrow(() -> new ResourceNotFoundException("Invalid or non-existing reset token."));

		if (resetToken.isExpired()) {
			passwordResetTokenRepository.delete(resetToken);
			throw new BadRequestException("The reset token has expired. Please request a new password reset.");
		}

		User user = resetToken.getUser();
		user.setPasswordHashed(passwordEncoder.encode(request.getNewPassword()));
		userRepository.save(user);

		passwordResetTokenRepository.delete(resetToken);

		refreshTokenService.deleteByUserId(user);

		log.info("Password successfully updated and token revoked for user ID: {}", user.getId());
	}


	@Transactional
	public void softDeleteUser(String email) {
		String cleanEmail = EmailUtils.normalize(email);

		User user = userRepository.findByEmail(cleanEmail)
				.orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

		UUID userId = user.getId();

		String originalEmail = user.getEmail();
		String originalName = (user.getFirstName() != null && !user.getFirstName().isBlank()) ? user.getFirstName() : "there";

		List<Workspace> ownedWorkspaces = workspaceRepository.findByOwnerId(userId);
		List<String> blockingWorkspaces = new ArrayList<>();
		List<Workspace> workspacesToDelete = new ArrayList<>();
		List<Workspace> workspacesToTransfer = new ArrayList<>();

		for (Workspace ws : ownedWorkspaces) {
			long memberCont = workspaceMemberRepository.countByWorkspaceId(ws.getId());

			if (memberCont == 1)
				workspacesToDelete.add(ws);
			else {
				boolean hasOtherAdmin = workspaceMemberRepository.existsByWorkspaceIdAndUserIdNotAndRole(
						ws.getId(), userId, WorkspaceMemberRole.ADMIN);

				if (hasOtherAdmin)
					workspacesToTransfer.add(ws);
				else
					blockingWorkspaces.add(ws.getName());
			}
		}

		if (!blockingWorkspaces.isEmpty()) {
			String message = String.format(
					"You must add another admin to your workspace(s) [%s] or delete them before deleting your account.",
					String.join(", ", blockingWorkspaces)
			);
			throw new BadRequestException(message);
		}

		if (!workspacesToDelete.isEmpty()) {
			List<UUID> workspaceIdsToDelete = workspacesToDelete.stream()
					.map(Workspace::getId)
					.toList();
			workspaceInvitationRepository.deleteByWorkspaceIdIn(workspaceIdsToDelete);

			workspaceRepository.deleteAll(workspacesToDelete);
		}

		for (Workspace ws : workspacesToTransfer) {
			WorkspaceMember nextAdmin = workspaceMemberRepository
					.findFirstByWorkspaceIdAndUserIdNotAndRoleOrderByCreatedAtAsc(ws.getId(), userId, WorkspaceMemberRole.ADMIN)
					.orElseThrow(() -> new IllegalStateException("Admin not found despite exists check"));

			ws.setOwner(nextAdmin.getUser());
			workspaceRepository.save(ws);
		}

		taskRepository.unassignTasksByUserId(userId);

		notificationRepository.deleteByRecipientId(userId);
		workspaceMemberRepository.deleteByUserId(userId);

		workspaceInvitationRepository.deleteByInviterId(userId);
		workspaceInvitationRepository.deleteByInviteeEmail(originalEmail);

		verificationCodeRepository.deleteByUserId(userId);
		refreshTokenRepository.deleteByUserId(userId);
		apiKeyRepository.deleteByUserId(userId);
		passwordResetTokenRepository.deleteByUserId(userId);

		user.setEmail("deleted_" + userId + "@teampulse.local");
		user.setFirstName("Deleted");
		user.setLastName("User");
		user.setProviderId(null);
		user.setPasswordHashed(passwordEncoder.encode(UUID.randomUUID().toString()));
		user.setEnabled(false);
		user.setDeleted(true);

		if (user.getAvatarUrl() != null)
			fileStorageService.deleteAvatar(user.getAvatarUrl());

		user.setAvatarUrl(null);
		userRepository.save(user);

		log.info("User account with email {} has been successfully soft-deleted in DB.", EmailUtils.maskEmail(email));

		if (TransactionSynchronizationManager.isActualTransactionActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCommit() {
					try {
						String subject = "Account Deletion Confirmation - Team-Pulse";
						String body = String.format(
								"Hello %s,\n\n" +
										"Your Team-Pulse account (%s) has been successfully deleted.\n" +
										"All associated personal sessions have been terminated. If you did not request this deletion, please contact support immediately.\n\n" +
										"Best regards,\nThe Team-Pulse Team",
								originalName, originalEmail
						);

						emailService.sendEmail(originalEmail, subject, body);
						log.info("Account deletion confirmation email sent to: {}", EmailUtils.maskEmail(originalEmail));

					} catch (Exception ex) {
						log.warn("Account deleted for [{}], but failed to send confirmation email: {}", EmailUtils.maskEmail(originalEmail), ex.getMessage());
					}
				}
			});
		}
	}

	@Transactional
	public void hardDeleteUnverifiedAccounts(int expirationHours) {
		LocalDateTime cutoffDate = LocalDateTime.now().minusHours(expirationHours);

		List<UUID> unverifiedUserIds = userRepository.findUnverifiedUserIdsOlderThan(cutoffDate);

		if (unverifiedUserIds.isEmpty()) {
			log.info("No unverified accounts found for hard deletion.");
			return;
		}
		log.info("Starting hard deletion for {} unverified user accounts...", unverifiedUserIds.size());

		verificationCodeRepository.deleteByUserIdIn(unverifiedUserIds);
		refreshTokenRepository.deleteByUserIdIn(unverifiedUserIds);
		apiKeyRepository.deleteByUserIdIn(unverifiedUserIds);
		passwordResetTokenRepository.deleteByUserIdIn(unverifiedUserIds);

		userRepository.deleteByIdIn(unverifiedUserIds);

		log.info("Successfully hard deleted {} unverified accounts and associated entities.", unverifiedUserIds.size());
	}

	@Transactional
	public UserResponse uploadProfileAvatar(UUID userId, MultipartFile file) {
		validateAvatarFile(file);

		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		if (user.getAvatarUrl() != null && user.getAvatarUrl().contains("/avatars/")) {
			try {
				fileStorageService.deleteAvatar(user.getAvatarUrl());
			} catch (Exception e) {
				log.warn("Failed to delete old avatar for user [{}]: {}", userId, e.getMessage());
			}
		}

		String avatarUrl = fileStorageService.uploadAvatar(file);
		user.setAvatarUrl(avatarUrl);
		User updatedUser = userRepository.save(user);

		return userMapper.toResponse(updatedUser);
	}

	@Transactional
	public AuthResponse googleLogin(GoogleLoginRequest request) {
		try {
			GoogleIdToken idToken = googleIdTokenVerifier.verify(request.getIdToken());
			if (idToken == null)
				throw new BadCredentialsException("Invalid Google ID Token");

			GoogleIdToken.Payload payload = idToken.getPayload();

			String email = EmailUtils.normalize(payload.getEmail());
			String googleId = payload.getSubject();
			String firstName = (String) payload.get("given_name");
			String lastName = (String) payload.get("family_name");
			String pictureUrl = (String) payload.get("picture");

			AtomicBoolean isNewSignup = new AtomicBoolean(false);

			User user = userRepository.findByEmail(email)
					.map(existingUser -> {
						if (existingUser.getProvider() == AuthProvider.LOCAL) {
							existingUser.setProvider(AuthProvider.GOOGLE);
							existingUser.setProviderId(googleId);
							existingUser.setEnabled(true);

							if (existingUser.getAvatarUrl() == null)
								existingUser.setAvatarUrl(pictureUrl);

							isNewSignup.set(true);

							return userRepository.save(existingUser);
						}
						return existingUser;
					})
					.orElseGet(() -> {
						isNewSignup.set(true);
						return userRepository.save(
								User.builder()
										.email(email)
										.firstName(firstName)
										.lastName(lastName)
										.avatarUrl(pictureUrl)
										.provider(AuthProvider.GOOGLE)
										.providerId(googleId)
										.enabled(true)
										.build());
					});

			if (isNewSignup.get())
				eventPublisher.publishEvent(new UserWelcomeEvent(this, user.getId(), user.getEmail(), user.getFirstName()));

			UserPrincipal userPrincipal = new UserPrincipal(user);
			String accessToken = jwtUtils.generateToken(userPrincipal);

			refreshTokenService.deleteByUserId(user);
			RefreshToken refreshToken = refreshTokenService.createRefreshToken(
					user, ClientIpUtils.getClientIp(httpServletRequest), getUserAgent());

			return AuthResponse.builder()
					.accessToken(accessToken)
					.refreshToken(refreshToken.getToken())
					.user(userMapper.toResponse(user))
					.build();

		} catch (BadCredentialsException e) {
			throw e;
		} catch (Exception e) {
			log.error("Google authentication failed: {}", e.getMessage(), e);
			throw new BadCredentialsException("Failed to authenticate with Google. Please try again later.");
		}
	}

	private void validateAvatarFile(MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new BadRequestException("File cannot be empty.");
		}

		if (file.getSize() > MAX_FILE_SIZE) {
			throw new BadRequestException("File size exceeds the maximum allowed limit of 5MB.");
		}

		String contentType = file.getContentType();
		if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
			throw new BadRequestException("Invalid file type. Only JPG, PNG, and WEBP images are allowed.");
		}

		String originalFilename = file.getOriginalFilename();
		if (originalFilename == null || !originalFilename.contains(".")) {
			throw new BadRequestException("Invalid file name or extension.");
		}

		String extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase(Locale.ROOT);
		if (!ALLOWED_EXTENSIONS.contains(extension)) {
			throw new BadRequestException("Invalid file extension.");
		}
	}


	private String getUserAgent() {
		if (httpServletRequest == null) return "Unknown";
		String userAgent = httpServletRequest.getHeader("User-Agent");
		return userAgent != null ? userAgent : "Unknown";
	}
}

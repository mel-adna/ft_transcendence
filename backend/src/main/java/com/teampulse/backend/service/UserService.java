package com.teampulse.backend.service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.teampulse.backend.dto.request.ForgotPasswordRequest;
import com.teampulse.backend.dto.request.GoogleLoginRequest;
import com.teampulse.backend.dto.request.LoginRequest;
import com.teampulse.backend.dto.request.PasswordChangeRequest;
import com.teampulse.backend.dto.request.ProfileUpdateRequest;
import com.teampulse.backend.dto.request.RefreshTokenRequest;
import com.teampulse.backend.dto.request.ResetPasswordRequest;
import com.teampulse.backend.dto.request.SignupRequest;
import com.teampulse.backend.dto.response.AuthResponse;
import com.teampulse.backend.dto.response.UserResponse;
import com.teampulse.backend.exception.BadRequestException;
import com.teampulse.backend.exception.ResourceAlreadyExistsException;
import com.teampulse.backend.exception.ResourceNotFoundException;
import com.teampulse.backend.exception.UnauthorizedAccessException;
import com.teampulse.backend.mapper.UserMapper;
import com.teampulse.backend.model.PasswordResetToken;
import com.teampulse.backend.model.User;
import com.teampulse.backend.model.enums.AuthProvider;
import com.teampulse.backend.repository.PasswordResetTokenRepository;
import com.teampulse.backend.repository.UserRepository;
import com.teampulse.backend.security.JwtUtils;
import com.teampulse.backend.security.UserPrincipal;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtUtils jwtUtils;
	private final AuthenticationManager authenticationManager;
	private final PasswordResetTokenRepository passwordResetTokenRepository;
	private final EmailService emailService;
	private final UserMapper userMapper;
	private final FileStorageService fileStorageService;

	@Value("${app.frontend-url}")
	private String frontendUrl;

	@Value("${spring.security.oauth2.client.registration.google.client-id}")
	private String googleClientId;

	@Transactional
	public AuthResponse signup(SignupRequest request) {
		if (userRepository.findByEmail(request.getEmail()).isPresent())
			throw new ResourceAlreadyExistsException("Email '" + request.getEmail() + "' is already registered!");

		User user = new User();
		user.setEmail(request.getEmail());
		user.setPasswordHashed(passwordEncoder.encode(request.getPassword()));
		user.setFirstName(request.getFirstName());
		user.setLastName(request.getLastName());

		User savedUser = userRepository.save(user);
		UserPrincipal userPrincipal = new UserPrincipal(savedUser);

		String accessToken = jwtUtils.generateToken(userPrincipal);
		String refreshToken = jwtUtils.generateRefreshToken(userPrincipal);

		return AuthResponse.builder()
				.accessToken(accessToken)
				.refreshToken(refreshToken)
				.user(userMapper.toResponse(savedUser))
				.build();
	}

	@Transactional(readOnly = true)
	public AuthResponse login(LoginRequest request) {
		try {
			Authentication authentication = authenticationManager.authenticate(
					new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

			UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
			User user = userPrincipal.getUser();

			String accessToken = jwtUtils.generateToken(userPrincipal);
			String refreshToken = jwtUtils.generateRefreshToken(userPrincipal);

			return AuthResponse.builder()
					.accessToken(accessToken)
					.refreshToken(refreshToken)
					.user(userMapper.toResponse(user))
					.build();

		} catch (BadCredentialsException ex) {
			throw new UnauthorizedAccessException("Invalid email or password. Please try again.");
		}
	}

	@Transactional(readOnly = true)
	public AuthResponse refreshToken(RefreshTokenRequest request) {
		String refreshToken = request.getRefreshToken();
		String email = jwtUtils.extractUsername(refreshToken);

		if (email != null) {
			User user = userRepository.findByEmail(email)
					.orElseThrow(() -> new ResourceNotFoundException("User not found"));

			UserPrincipal userPrincipal = new UserPrincipal(user);

			if (jwtUtils.isTokenValid(refreshToken, userPrincipal)) {
				String newAccessToken = jwtUtils.generateToken(userPrincipal);

				return AuthResponse.builder()
						.accessToken(newAccessToken)
						.refreshToken(refreshToken)
						.user(userMapper.toResponse(user))
						.build();
			}
		}
		throw new BadRequestException("Invalid or expired refresh token!");
	}

	@Transactional
	public UserResponse updateProfile(String currentEmail, ProfileUpdateRequest request) {
		User user = userRepository.findByEmail(currentEmail)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		user.setFirstName(request.getFirstName());
		user.setLastName(request.getLastName());
		user.setAvatarUrl(request.getAvatarUrl());

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
	}

	@Transactional(readOnly = true)
	public UserResponse getCurrentUserByEmail(String email) {
		if (email == null)
			throw new BadRequestException("Email cannot be null");

		User user = userRepository.findByEmail(email)
				.orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

		return userMapper.toResponse(user);
	}

	@Transactional(readOnly = true)
	public List<UserResponse> searchUsersByEmail(String email) {
		if (email == null || email.trim().isEmpty())
			return List.of();

		List<User> users = userRepository.findByEmailContainingIgnoreCase(email.trim());

		return users.stream().map(userMapper::toResponse).toList();
	}

	@Transactional
	public void processForgotPassword(ForgotPasswordRequest request) {
		log.info("Received password reset request for email: {}", request.getEmail());

		Optional<User> userOptional = userRepository.findByEmail(request.getEmail());
		if (userOptional.isEmpty()) {
			log.warn("Password reset initiated for non-existing email: {}", request.getEmail());
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
		log.info("Password successfully updated and token revoked for user ID: {}", user.getId());
	}

	@Transactional
	public void softDeleteUser(String email) {
		User user = userRepository.findByEmail(email)
				.orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

		userRepository.delete(user);

		log.info("User account with email {} has been successfully soft-deleted.", email);
	}

	public UserResponse uploadProfileAvatar(UUID userId, MultipartFile file) {
		String avatarUrl = fileStorageService.uploadAvatar(file);

		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		user.setAvatarUrl(avatarUrl);
		User updatedUser = userRepository.save(user);

		return userMapper.toResponse(updatedUser);
	}

	@Transactional
	public AuthResponse googleLogin(GoogleLoginRequest request) {
		try {
			GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
					new NetHttpTransport(),
					GsonFactory.getDefaultInstance())
					.setAudience(Collections.singletonList(googleClientId))
					.build();

			GoogleIdToken idToken = verifier.verify(request.getIdToken());
			if (idToken == null) {
				throw new BadCredentialsException("Invalid Google ID Token");
			}

			GoogleIdToken.Payload payload = idToken.getPayload();

			String email = payload.getEmail();
			String googleId = payload.getSubject();
			String firstName = (String) payload.get("given_name");
			String lastName = (String) payload.get("family_name");
			String pictureUrl = (String) payload.get("picture");

			User user = userRepository.findByEmail(email)
					.map(existingUser -> {
						if (existingUser.getProvider() == AuthProvider.LOCAL) {
							existingUser.setProvider(AuthProvider.GOOGLE);
							existingUser.setProviderId(googleId);
							if (existingUser.getAvatarUrl() == null) {
								existingUser.setAvatarUrl(pictureUrl);
							}
							return userRepository.save(existingUser);
						}
						return existingUser;
					})
					.orElseGet(() -> userRepository.save(
							User.builder()
									.email(email)
									.firstName(firstName)
									.lastName(lastName)
									.avatarUrl(pictureUrl)
									.provider(AuthProvider.GOOGLE)
									.providerId(googleId)
									.build()));

			UserPrincipal userPrincipal = new UserPrincipal(user);
			String accessToken = jwtUtils.generateToken(userPrincipal);
			String refreshToken = jwtUtils.generateRefreshToken(userPrincipal);

			return AuthResponse.builder()
					.accessToken(accessToken)
					.refreshToken(refreshToken)
					.user(userMapper.toResponse(user))
					.build();

		} catch (Exception e) {
			throw new BadCredentialsException("Failed to authenticate with Google: " + e.getMessage());
		}
	}
}

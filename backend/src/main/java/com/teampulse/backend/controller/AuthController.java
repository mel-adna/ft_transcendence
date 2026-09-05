package com.teampulse.backend.controller;

import java.security.Principal;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.teampulse.backend.dto.request.ForgotPasswordRequest;
import com.teampulse.backend.dto.request.GoogleLoginRequest;
import com.teampulse.backend.dto.request.LoginRequest;
import com.teampulse.backend.dto.request.PasswordChangeRequest;
import com.teampulse.backend.dto.request.RefreshTokenRequest;
import com.teampulse.backend.dto.request.ResetPasswordRequest;
import com.teampulse.backend.dto.request.SignupRequest;
import com.teampulse.backend.dto.response.AuthResponse;
import com.teampulse.backend.service.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication & Profile", description = "Endpoints for user identity management, registration, session renewal, and profile adjustments.")
public class AuthController {
	private final UserService userService;

	@Operation(summary = "Register a new user", description = "Creates a new user account in Team-Pulse and returns access/refresh tokens.")
	@ApiResponses({
			@ApiResponse(responseCode = "201", description = "User registered successfully"),
			@ApiResponse(responseCode = "400", description = "Email already exists or validation constraints failed")
	})
	@PostMapping("/signup")
	public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
		return new ResponseEntity<>(userService.signup(request), HttpStatus.CREATED);
	}

	@Operation(summary = "Authenticate user", description = "Verifies user credentials and issues short-lived Access Tokens and long-lived Refresh Tokens.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Authentication successful"),
			@ApiResponse(responseCode = "401", description = "Bad credentials - Invalid email or password")
	})
	@PostMapping("/login")
	public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
		return ResponseEntity.ok(userService.login(request));
	}

	@Operation(summary = "Refresh access token", description = "Provides a new, valid Access Token using a non-expired Refresh Token.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Token refreshed successfully"),
			@ApiResponse(responseCode = "403", description = "Forbidden - Refresh token is expired or revoked")
	})
	@PostMapping("/refresh")
	public ResponseEntity<AuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
		return ResponseEntity.ok(userService.refreshToken(request));
	}


	@Operation(summary = "Change account password", description = "Allows the logged-in user to change their password after validating the old one.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Password changed successfully"),
			@ApiResponse(responseCode = "400", description = "Current password does not match or new password rules violated"),
			@ApiResponse(responseCode = "401", description = "Unauthorized")
	})
	@PostMapping("/change-password")
	public ResponseEntity<String> changePassword(Principal principal,
			@Valid @RequestBody PasswordChangeRequest request) {
		userService.changePassword(principal.getName(), request);
		return ResponseEntity.ok("Password changed successfully");
	}

	@Operation(summary = "Logout user", description = "Revokes and deletes the provided Refresh Token from the database to invalidate the session.")
	@ApiResponses({
			@ApiResponse(responseCode = "204", description = "Logged out successfully"),
			@ApiResponse(responseCode = "400", description = "Invalid request payload")
	})
	@PostMapping("/logout")
	public ResponseEntity<Void> logout(@Valid @RequestBody RefreshTokenRequest request) {
		userService.logout(request.getRefreshToken());
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Initiate password reset sequence", description = "Generates a secure token and sends a recovery link to the user's email if the account exists.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "If the email exists, a password reset link has been dispatched.")
	})
	@PostMapping("/forgot-password")
	public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
		userService.processForgotPassword(request);
		return ResponseEntity.ok("If the email is registered, a password reset link has been sent successfully.");
	}

	@Operation(summary = "Execute password reset", description = "Validates the security token and updates the user's account password.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Password reset successfully completed"),
			@ApiResponse(responseCode = "400", description = "Token is expired or constraints failed"),
			@ApiResponse(responseCode = "404", description = "Token not found")
	})
	@PostMapping("/reset-password")
	public ResponseEntity<String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
		userService.processResetPassword(request);
		return ResponseEntity.ok("Your password has been successfully reset. You can now log in.");
	}

	@Operation(summary = "Authenticate with Google", description = "Validates Google ID Token and issues access/refresh tokens.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Authentication successful"),
			@ApiResponse(responseCode = "401", description = "Invalid Google ID Token")
	})
	@PostMapping("/google")
	public ResponseEntity<AuthResponse> googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
		return ResponseEntity.ok(userService.googleLogin(request));
	}
}

package com.teampulse.backend.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.teampulse.backend.dto.request.ProfileUpdateRequest;
import com.teampulse.backend.dto.response.UserResponse;
import com.teampulse.backend.security.UserPrincipal;
import com.teampulse.backend.service.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "Endpoints for managing user profiles, account settings, and user discovery.")
public class UserController {

	private final UserService userService;

	@Operation(summary = "Get currently authenticated user details", description = "Fetches the profile info of the user identified by the current JWT token. Essential for Frontend initialization.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "User details retrieved successfully", content = @Content(schema = @Schema(implementation = UserResponse.class))),
			@ApiResponse(responseCode = "401", description = "Unauthorized - Missing or invalid token", content = @Content),
			@ApiResponse(responseCode = "404", description = "User not found", content = @Content)
	})
	@GetMapping("/me")
	public ResponseEntity<UserResponse> getCurrentUser(@Parameter(hidden = true) Principal principal) {
		UserResponse userResponse = userService.getCurrentUserByEmail(principal.getName());
		return ResponseEntity.ok(userResponse);
	}

	
	@Operation(summary = "Update profile metadata", description = "Updates the authenticated user's first name, last name, and avatar URL.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Profile metadata updated successfully", content = @Content(schema = @Schema(implementation = UserResponse.class))),
			@ApiResponse(responseCode = "400", description = "Invalid validation constraints on input fields", content = @Content),
			@ApiResponse(responseCode = "401", description = "Unauthorized - Active session required", content = @Content)
	})
	@PutMapping("/me")
	public ResponseEntity<UserResponse> updateProfile(@Valid @RequestBody ProfileUpdateRequest request,
			@Parameter(hidden = true) Principal principal) {
		UserResponse updatedUser = userService.updateProfile(principal.getName(), request);
		return ResponseEntity.ok(updatedUser);
	}


	@Operation(summary = "Search users by email string", description = "Performs a case-insensitive partial match search on user emails. Essential for adding members to tasks or workspaces.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Search query completed successfully"),
			@ApiResponse(responseCode = "401", description = "Unauthorized - Valid JWT token required", content = @Content)
	})
	@GetMapping("/search")
	public ResponseEntity<List<UserResponse>> searchUsers(
			@Parameter(description = "Partial or complete email search string", required = true, example = "mohamed@") @RequestParam String email) {

		List<UserResponse> users = userService.searchUsersByEmail(email);

		return ResponseEntity.ok(users);
	}

	@Operation(summary = "Soft-delete the currently authenticated user account", description = "Deactivates the user account and marks it as deleted. Active sessions will be invalidated.")
	@ApiResponses({
			@ApiResponse(responseCode = "204", description = "Account soft-deleted successfully"),
			@ApiResponse(responseCode = "401", description = "Unauthorized - Active session required", content = @Content),
			@ApiResponse(responseCode = "404", description = "User not found", content = @Content)
	})
	@DeleteMapping("/me")
	public ResponseEntity<Void> deleteCurrentUser(@Parameter(hidden = true) Principal principal) {

		userService.softDeleteUser(principal.getName());

		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Upload profile avatar", description = "Uploads an image file to MinIO storage and updates the authenticated user's profile avatar URL.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Avatar uploaded successfully", content = @Content(schema = @Schema(implementation = UserResponse.class))),
			@ApiResponse(responseCode = "400", description = "Invalid file - empty or unsupported image format", content = @Content),
			@ApiResponse(responseCode = "401", description = "Unauthorized - Active session required", content = @Content)
	})
	@PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<UserResponse> uploadAvatar(
			@Parameter(hidden = true) @AuthenticationPrincipal UserPrincipal currentUser,
			@Parameter(description = "Image file (JPEG, PNG, etc.) to set as profile avatar", required = true) @RequestParam("file") MultipartFile file) {
		UserResponse response = userService.uploadProfileAvatar(currentUser.getUser().getId(), file);
		return ResponseEntity.ok(response);
	}
}

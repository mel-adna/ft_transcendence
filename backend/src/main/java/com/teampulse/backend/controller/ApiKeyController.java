package com.teampulse.backend.controller;

import com.teampulse.backend.dto.response.ApiKeyResponse;
import com.teampulse.backend.security.UserPrincipal;
import com.teampulse.backend.service.ApiKeyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api-key")
@RequiredArgsConstructor
@Tag(name = "API Key Management", description = "Endpoints for managing user API Keys (JWT Protected)")
public class ApiKeyController {
	private final ApiKeyService apiKeyService;


	@Operation(
			summary = "Generate or rotate API Key",
			description = "Deletes existing key and generates a new SHA-256 stateful API Key. Returns raw key ONCE."
	)
	@PostMapping("/rotate")
	public ResponseEntity<Map<String, String>> rotateApiKey(@AuthenticationPrincipal UserPrincipal currentUser) {
		String rawKey = apiKeyService.generateOrRotateApiKey(currentUser.getUsername());

		return ResponseEntity.ok(Map.of(
				"apiKey", rawKey,
				"warning", "Copy your API key now. You will not be able to see it again!"
		));
	}


	@Operation(summary = "Get API Key metadata")
	@GetMapping
	public ResponseEntity<ApiKeyResponse> getApiKeyInfo(@AuthenticationPrincipal UserPrincipal currentUser) {
		return ResponseEntity.ok(apiKeyService.getApiKeyInfo(currentUser.getUsername()));
	}


	@Operation(summary = "Revoke API Key")
	@DeleteMapping
	public ResponseEntity<Map<String, String>> revokeApiKey(@AuthenticationPrincipal UserPrincipal currentUser) {
		apiKeyService.revokeApiKey(currentUser.getUsername());

		return ResponseEntity.ok(Map.of("message", "API key revoked successfully."));
	}
}

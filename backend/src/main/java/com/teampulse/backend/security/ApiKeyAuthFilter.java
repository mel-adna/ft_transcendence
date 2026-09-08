package com.teampulse.backend.security;


import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class ApiKeyAuthFilter extends OncePerRequestFilter {
	@Value("${app.api.public-key}")
	private String apiKey;

	private static final List<String> PROTECTED_PATHS = List.of(
			"/public/tasks",
			"/public/users",
			"/public/organizations",
			"/public/stats",
			"/public/chat"
	);

	@Override
	protected void doFilterInternal(@NonNull HttpServletRequest request,
	                                @NonNull HttpServletResponse response,
	                                @NonNull FilterChain filterChain) throws ServletException, IOException {
		String requestPath = request.getServletPath();

		boolean isPublicApiKey = PROTECTED_PATHS.stream().anyMatch(requestPath::startsWith);

		if (isPublicApiKey) {
			String recievedApiKey = request.getHeader("X-Api-Key");

			if (recievedApiKey == null || recievedApiKey.isEmpty() || !recievedApiKey.equals(apiKey)) {
				response.setStatus(HttpStatus.UNAUTHORIZED.value());
				response.setContentType("application/json");
				response.getWriter().write("{\"error\": \"Unauthorized\", \"message\": \"Invalid or missing X-API-KEY header\"}");
				return;
			}
		}
		filterChain.doFilter(request, response);
	}
}

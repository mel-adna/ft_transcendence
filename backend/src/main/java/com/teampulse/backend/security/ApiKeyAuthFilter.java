package com.teampulse.backend.security;


import com.teampulse.backend.model.User;
import com.teampulse.backend.service.ApiKeyService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class ApiKeyAuthFilter extends OncePerRequestFilter {

	private final ApiKeyService apiKeyService;

	@Override
	protected void doFilterInternal(@NonNull HttpServletRequest request,
	                                @NonNull HttpServletResponse response,
	                                @NonNull FilterChain filterChain) throws ServletException, IOException {

		String requestPath = request.getServletPath();

		if (requestPath.startsWith("/public")) {
			String apiKeyHeader = request.getHeader("X-API-Key");

			if (apiKeyHeader == null || apiKeyHeader.isBlank()) {
				sendUnauthorizedError(response, "Missing X-API-KEY header");
				return;
			}

			User user = apiKeyService.validateApiKeyAndGetUser(apiKeyHeader);
			if (user == null) {
				sendUnauthorizedError(response, "Invalid or revoked X-API-KEY header");
				return;
			}

			UserPrincipal userPrincipal = new UserPrincipal(user);
			UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
					userPrincipal, null, userPrincipal.getAuthorities());

			authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
			SecurityContextHolder.getContext().setAuthentication(authToken);
		}
		filterChain.doFilter(request, response);
	}


	private void sendUnauthorizedError(HttpServletResponse response, String message) throws IOException {
		response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
		response.setContentType("application/json");
		response.getWriter().write(String.format("{\"error\": \"Unauthorized\", \"message\": \"%s\"}", message));
	}
}

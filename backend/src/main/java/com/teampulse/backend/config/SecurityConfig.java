package com.teampulse.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teampulse.backend.security.ApiKeyAuthFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.teampulse.backend.security.JwtAuthenticationFilter;

import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

	private final JwtAuthenticationFilter jwtAuthFilter;
	private final UserDetailsService customUserDetailsService;
	private final ApiKeyAuthFilter apiKeyAuthFilter;

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper objectMapper) throws Exception {
		http
				/*
				 * CSRF protection is intentionally disabled due to the stateless architecture:
				 * 1. Authentication relies strictly on short-lived JWTs sent in request headers (Authorization: Bearer <token>).
				 * 2. The server does not maintain session state (SessionCreationPolicy.STATELESS), rendering traditional CSRF attacks ineffective.
				 * 3. Refresh tokens issued via HTTP only cookies are protected with strict SameSite attributes and explicit CORS origin rules.
				 */
				.csrf(csrf -> csrf.disable())
				.cors(Customizer.withDefaults())

				.headers(headers -> headers
						.frameOptions(frame -> frame.sameOrigin())
				)

				.exceptionHandling(ex -> ex
						.authenticationEntryPoint((request, response, authException) -> {
							response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
							response.setContentType(MediaType.APPLICATION_JSON_VALUE);

//							String json = String.format(
//									"{\"timestamp\":\"%s\",\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Full authentication is required or token has expired.\",\"path\":\"%s\"}",
//									LocalDateTime.now(),
//									request.getRequestURI()
//							);

							Map<String, Object> body = Map.of(
									"timestamp", LocalDateTime.now().toString(),
									"status", 401,
									"error", "Unauthorized",
									"message", "Full authentication is required or token has expired.",
									"path", request.getRequestURI()
							);

							response.getWriter().write(objectMapper.writeValueAsString(body));
						})
				)

				.authorizeHttpRequests(auth -> auth
						.requestMatchers(
								"/auth/login",
								"/auth/signup",
								"/auth/google",
								"/auth/forgot-password",
								"/auth/reset-password",
								"/auth/verify-email",
								"/auth/resend-verification",
								"/auth/refresh",
								"/auth/logout",

								"/public/**",

								"/actuator/health",
								"/actuator/prometheus",

								/*
								 * Intentionally permitted in production:
								 * Enables external clients & API key holders to inspect public API documentation.
								 */
								"/v3/api-docs/**",
								"/swagger-ui/**",
								"/swagger-ui.html",

								"/error"
						).permitAll()
						.anyRequest().authenticated()
				)
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authenticationProvider(authenticationProvider())
				.addFilterBefore(apiKeyAuthFilter, UsernamePasswordAuthenticationFilter.class)
				.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

		return http.build();
	}

	@Bean
	public AuthenticationProvider authenticationProvider() {
		DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(customUserDetailsService);
		authProvider.setPasswordEncoder(passwordEncoder());
		return authProvider;
	}

	@Bean
	public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
		return config.getAuthenticationManager();
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder(12);
	}
}

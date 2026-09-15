package com.teampulse.backend.config;

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

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

	private final JwtAuthenticationFilter jwtAuthFilter;
	private final UserDetailsService customUserDetailsService;
	private final ApiKeyAuthFilter apiKeyAuthFilter;

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
				.csrf(csrf -> csrf.disable())
				.cors(Customizer.withDefaults())

				.headers(headers -> headers
						.contentSecurityPolicy(csp -> csp
								.policyDirectives(
										"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com/gsi/client; " +
												"script-src-elem 'self' 'unsafe-inline' https://accounts.google.com/gsi/client; " +
												"style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; " +
												"frame-src 'self' https://accounts.google.com/gsi/; " +
												"connect-src 'self' https://accounts.google.com/gsi/; " +
												"img-src 'self' data: https://lh3.googleusercontent.com;"
								)
						)
				)

				.exceptionHandling(ex -> ex
						.authenticationEntryPoint((request, response, authException) -> {
							response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
							response.setContentType(MediaType.APPLICATION_JSON_VALUE);

							String json = String.format(
									"{\"timestamp\":\"%s\",\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Full authentication is required or token has expired.\",\"path\":\"%s\"}",
									LocalDateTime.now(),
									request.getRequestURI()
							);

							response.getWriter().write(json);
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

								"/actuator/**",
								"/v3/api-docs/**",
								"/swagger-ui/**",
								"/swagger-ui.html",
								"/error")
						.permitAll()
						.anyRequest().authenticated())

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
		return new BCryptPasswordEncoder();
	}
}

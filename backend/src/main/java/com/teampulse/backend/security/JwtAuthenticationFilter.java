package com.teampulse.backend.security;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor 
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtUtils jwtUtils;
    private final CustomUserDetailsService customUserDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            final String jwt = authHeader.substring(7);
            final String userEmail = jwtUtils.extractUsername(jwt);

            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                UserDetails userDetails = this.customUserDetailsService.loadUserByUsername(userEmail);

                if (jwtUtils.isTokenValid(jwt, userDetails)) {

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities());

                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (ExpiredJwtException ex) {
            log.warn("JWT Token status: Expired | Path: {}", request.getRequestURI());
        } catch (JwtException ex) {
            log.warn("Invalid JWT Token | Path: {}", request.getRequestURI());
        } catch (Exception ex) {
            log.error("Authentication filter error: ", ex);
        }

        filterChain.doFilter(request, response);
    }
}






// @Component
// @RequiredArgsConstructor
// public class JwtAuthenticationFilter extends OncePerRequestFilter {

// 	private final JwtUtils jwtUtils;
// 	private final CustomUserDetailsService customUserDetailsService;

// 	@Autowired
// 	@Qualifier("handlerExceptionResolver")
// 	private HandlerExceptionResolver resolver;

// 	@Override
// 	protected void doFilterInternal(
// 			@NonNull HttpServletRequest request,
// 			@NonNull HttpServletResponse response,
// 			@NonNull FilterChain filterChain) throws ServletException, IOException {

// 		final String authHeader = request.getHeader("Authorization");
// 		final String jwt;
// 		final String userEmail;

// 		if (authHeader == null || !authHeader.startsWith("Bearer ")) {
// 			filterChain.doFilter(request, response);
// 			return;
// 		}

// 		try {
// 			jwt = authHeader.substring(7);
// 			userEmail = jwtUtils.extractUsername(jwt);

// 			if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {

// 				UserDetails userDetails = this.customUserDetailsService.loadUserByUsername(userEmail);

// 				if (jwtUtils.isTokenValid(jwt, userDetails)) {

// 					UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
// 							userDetails,
// 							null,
// 							userDetails.getAuthorities());

// 					authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

// 					SecurityContextHolder.getContext().setAuthentication(authToken);
// 				}
// 			}
// 			filterChain.doFilter(request, response);

// 		} catch (ExpiredJwtException ex) {
// 			resolver.resolveException(request, response, null, ex);
// 		} catch (Exception ex) {
// 			resolver.resolveException(request, response, null, ex);
// 		}
// 	}

	// @Override
	// protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
	// 	String path = request.getServletPath();

	// 	return path.startsWith("/api/v1/auth/login")
	// 			|| path.startsWith("/api/v1/auth/signup")
	// 			|| path.startsWith("/api/v1/auth/refresh")
	// 			|| path.startsWith("/api/v1/auth/forgot-password")
	// 			|| path.startsWith("/api/v1/auth/reset-password")
	// 			|| path.startsWith("/swagger-ui")
	// 			|| path.startsWith("/v3/api-docs");
	// }
// }
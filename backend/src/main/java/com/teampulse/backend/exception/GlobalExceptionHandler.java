package com.teampulse.backend.exception;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.teampulse.backend.dto.response.ErrorResponse;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(ResourceNotFoundException.class)
	public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
		log.warn("Resource not found: {} | Path: {}", ex.getMessage(), request.getRequestURI());
		return buildResponseEntity(HttpStatus.NOT_FOUND, ex.getMessage(), request, null);
	}

	@ExceptionHandler(UnauthorizedAccessException.class)
	public ResponseEntity<ErrorResponse> handleUnauthorizedAccess(UnauthorizedAccessException ex, HttpServletRequest request) {
		log.warn("Unauthorized access attempt: {} | Path: {}", ex.getMessage(), request.getRequestURI());
		return buildResponseEntity(HttpStatus.UNAUTHORIZED, ex.getMessage(), request, null);
	}

	@ExceptionHandler(ResourceAlreadyExistsException.class)
	public ResponseEntity<ErrorResponse> handleResourceAlreadyExists(ResourceAlreadyExistsException ex, HttpServletRequest request) {
		log.warn("Resource already exists conflict: {} | Path: {}", ex.getMessage(), request.getRequestURI());
		return buildResponseEntity(HttpStatus.CONFLICT, ex.getMessage(), request, null);
	}

	@ExceptionHandler(BadRequestException.class)
	public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException ex, HttpServletRequest request) {
		log.warn("Bad request execution: {} | Path: {}", ex.getMessage(), request.getRequestURI());
		return buildResponseEntity(HttpStatus.BAD_REQUEST, ex.getMessage(), request, null);
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponse>	handleValidationErrors(MethodArgumentNotValidException ex, HttpServletRequest request) {
		Map<String, String> validationError = new HashMap<>();
	
		for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
			validationError.put(fieldError.getField(), fieldError.getDefaultMessage());
		}

		log.warn("Validation failed for request to: {} | Errors: {}", request.getRequestURI(), validationError);
		return buildResponseEntity(HttpStatus.BAD_REQUEST, "Validation failed", request, validationError);
	}

	@ExceptionHandler(ExpiredJwtException.class)
    public ResponseEntity<ErrorResponse> handleExpiredJwtException(io.jsonwebtoken.ExpiredJwtException ex, HttpServletRequest request) {
        log.warn("JWT Token status: Expired | Path: {}", request.getRequestURI());
        return buildResponseEntity(
                HttpStatus.UNAUTHORIZED, 
                "Your session has expired. Please refresh your token or log in again.", 
                request, 
                null
        );
    }

	@ExceptionHandler({
        UsernameNotFoundException.class,
        SignatureException.class,
        MalformedJwtException.class
    })
    public ResponseEntity<ErrorResponse> handleSecurityAuthExceptions(Exception ex, HttpServletRequest request) {
        log.warn("Security exception caught: {} | Path: {}", ex.getMessage(), request.getRequestURI());
        return buildResponseEntity(
                HttpStatus.UNAUTHORIZED, 
                "Authentication failed. Your token is invalid, altered, or the account was deleted.", 
                request, 
                null
        );
    }

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponse> handleGlobalException(Exception ex, HttpServletRequest request) {
		log.error("CRITICAL ERROR internal server crash at path: ", ex);
		return buildResponseEntity(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected server error occurred. Please try again later.", request, null);
	}

	private ResponseEntity<ErrorResponse> buildResponseEntity(HttpStatus status, String message,
			HttpServletRequest request, Map<String, String> errors) {
		ErrorResponse errorResponse = ErrorResponse.builder()
				.timestamp(LocalDateTime.now())
				.status(status.value())
				.error(status.getReasonPhrase())
				.message(message)
				.path(request.getRequestURI())
				.errors(errors)
				.build();
		return new ResponseEntity<>(errorResponse, status);
	}
}

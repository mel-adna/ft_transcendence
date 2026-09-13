package com.teampulse.backend.security.ratelimit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teampulse.backend.exception.RateLimitExceededException;
import com.teampulse.backend.service.RateLimitingService;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.reflect.Method;
import java.util.concurrent.TimeUnit;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class RateLimitAspect {
	private final RateLimitingService rateLimitingService;
	private final ObjectMapper objectMapper;


	@Before("@within(RateLimit) || @annotation(RateLimit)")
	public void interceptRateLimitedMethods(JoinPoint joinPoint) {
		ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
		if (attributes == null)
			return;

		MethodSignature signature = (MethodSignature) joinPoint.getSignature();
		Method method = signature.getMethod();

		RateLimit rateLimit = method.getAnnotation(RateLimit.class);
		if (rateLimit == null) {
			rateLimit = method.getDeclaringClass().getAnnotation(RateLimit.class);
		}

		if (rateLimit == null) {
			return;
		}

		HttpServletRequest request = attributes.getRequest();
		String clientIp = getClientIp(request);
		String email = extractEmailFromArgs(joinPoint);

		String key = buildCacheKey(rateLimit.keyType(), clientIp, email, signature.toShortString());

		Bucket bucket = rateLimitingService.resolveBucket(key, rateLimit.capacity(), rateLimit.durationInMinutes());
		ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

		if (!probe.isConsumed()) {
			long waitForRefillSeconds = TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill());
			log.warn("[Rate Limit Exceeded] Key: {} | Retry after: {}s", key, waitForRefillSeconds);
			throw new RateLimitExceededException("Too many requests. Please try again later.", waitForRefillSeconds);
		}
	}


	private String buildCacheKey(RateLimitKeyType keyType, String ip, String email, String methodoSignature) {
		return switch (keyType) {
			case IP -> "rl:ip:" + ip + ":" + methodoSignature;
			case EMAIL -> "rl:email:" + (email != null ? email : ip) + ":" + methodoSignature;
			case IP_AND_EMAIL ->
					"rl:combo:" + ip + ":" + (email != null ? email : "anonymous") + ":" + methodoSignature;
		};
	}


	private String getClientIp(HttpServletRequest request) {
		String xfHeader = request.getHeader("X-Forwarded-For");

		if (xfHeader == null || xfHeader.isEmpty())
			return request.getRemoteAddr();

		return xfHeader.split(",")[0].trim();
	}


	private String extractEmailFromArgs(JoinPoint joinPoint) {
		for (Object arg : joinPoint.getArgs()) {
			if (arg != null) {
				try {
					String json = objectMapper.writeValueAsString(arg);
					JsonNode node = objectMapper.readTree(json);

					if (node.has("email")) {
						return node.get("email").asText();
					}
				} catch (Exception ignored) {
				}
			}
		}
		return null;
	}
}

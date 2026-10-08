package com.teampulse.backend.security.ratelimit;

import com.teampulse.backend.exception.RateLimitExceededException;
import com.teampulse.backend.security.utils.ClientIpUtils;
import com.teampulse.backend.security.utils.EmailUtils;
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
import java.util.Locale;
import java.util.concurrent.TimeUnit;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class RateLimitAspect {
	private final RateLimitingService rateLimitingService;

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
		String clientIp = ClientIpUtils.getClientIp(request);
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


	private String buildCacheKey(RateLimitKeyType keyType, String ip, String email, String methodSignature) {
		return switch (keyType) {
			case IP -> "rl:ip:" + ip + ":" + methodSignature;
			case EMAIL -> "rl:email:" + (email != null ? email : ip) + ":" + methodSignature;
			case IP_AND_EMAIL -> "rl:combo:" + ip + ":" + (email != null ? email : "anonymous") + ":" + methodSignature;
		};
	}


	private String extractEmailFromArgs(JoinPoint joinPoint) {
		for (Object arg : joinPoint.getArgs()) {
			if (arg == null) {
				continue;
			}

			try {
				Method getEmailMethod = arg.getClass().getMethod("getEmail");
				Object result = getEmailMethod.invoke(arg);
				if (result instanceof String emailStr && !emailStr.isBlank()) {
					return EmailUtils.normalize(emailStr);
				}
			} catch (Exception ignored) {
			}
		}
		return null;
	}
}
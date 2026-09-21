package com.teampulse.backend.security.ratelimit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
	int capacity() default 5;
	int durationInMinutes() default 1;
	RateLimitKeyType keyType() default RateLimitKeyType.IP;
}

package com.teampulse.backend.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Service;

import java.time.Duration;


@Service
public class RateLimitingService {
	private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
			.expireAfterAccess(Duration.ofHours(2))
			.build();

	public Bucket resolveBucket(String key, int capacity, int durationInMinutes) {
		return buckets.get(key, k -> createNewBucket(capacity, durationInMinutes));
	}

	private Bucket createNewBucket(int capacity, int durationInMinutes) {
		Bandwidth limit = Bandwidth.builder()
				.capacity(capacity)
				.refillGreedy(capacity, Duration.ofMinutes(durationInMinutes))
				.build();

		return Bucket.builder().addLimit(limit).build();
	}
}

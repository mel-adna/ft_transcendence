package com.teampulse.backend.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitingService {
	private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

	public Bucket resolveBucket(String key, int capacity, int durationInMinutes) {
		return buckets.computeIfAbsent(key, k -> createNewBucket(capacity, durationInMinutes));
	}

	private Bucket createNewBucket(int capacity, int durationInMinutes) {
		Bandwidth limit = Bandwidth.builder()
				.capacity(capacity)
				.refillGreedy(capacity, Duration.ofMinutes(durationInMinutes))
				.build();

		return Bucket.builder().addLimit(limit).build();
	}
}

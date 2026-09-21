package com.teampulse.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teampulse.backend.dto.messaging.UnifiedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.data.redis.core.StringRedisTemplate;


@Slf4j
@Service
@RequiredArgsConstructor
public class RedisEventPublisherService {
	private final StringRedisTemplate redisTemplate;
	private final ObjectMapper objectMapper;

	@Value("${app.redis.channel}")
	private String channelName;

	@Async
	public void publish(UnifiedEvent event) {
		try {
			String jsonMessage = objectMapper.writeValueAsString(event);
			redisTemplate.convertAndSend(channelName, jsonMessage);

			log.info("Real-time event sent to Redis | Type: {} | Recipient: {}", event.getType(), event.getRecipientId());
		} catch (Exception e) {
			log.error("Failed to send event to Redis: {}", e.getMessage());
		}
	}
}

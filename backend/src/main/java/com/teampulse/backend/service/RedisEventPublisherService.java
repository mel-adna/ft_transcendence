package com.teampulse.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teampulse.backend.dto.messaging.UnifiedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.stereotype.Service;
import org.springframework.data.redis.core.StringRedisTemplate;


@Slf4j
@Service
@RequiredArgsConstructor
public class RedisEventPublisherService {
	private final StringRedisTemplate redisTemplate;
	private final ObjectMapper objectMapper;
	private final ApplicationEventPublisher eventPublisher;

	public record CommittedRedisEvent(UnifiedEvent event) {}

	@Value("${app.redis.channel}")
	private String channelName;

	public void publish(UnifiedEvent event) {
		if (TransactionSynchronizationManager.isSynchronizationActive()
				&& TransactionSynchronizationManager.isActualTransactionActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCommit() {
					eventPublisher.publishEvent(new CommittedRedisEvent(event));
				}
			});
		} else {
			eventPublisher.publishEvent(new CommittedRedisEvent(event));
		}
	}

	@Async
	@EventListener
	public void sendCommitted(CommittedRedisEvent committed) {
		UnifiedEvent event = committed.event();
		try {
			String jsonMessage = objectMapper.writeValueAsString(event);
			redisTemplate.convertAndSend(channelName, jsonMessage);

			log.info("Real-time event sent to Redis | Type: {} | Recipient: {}", event.getType(), event.getRecipientId());
		} catch (Exception e) {
			log.error("Failed to send event to Redis: {}", e.getClass().getSimpleName());
		}
	}
}

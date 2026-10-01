package com.teampulse.backend.scheduler;

import com.teampulse.backend.enums.InvitationStatus;
import com.teampulse.backend.repository.WorkspaceInvitationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class InvitationCleanupScheduler {
	private WorkspaceInvitationRepository workspaceInvitationRepository;

	@Scheduled(cron = "0 0 3 * * SUN")
	@Transactional
	public void purgeOldInvitations() {
		Instant threshold = Instant.now().minus(30, ChronoUnit.DAYS);

		int deletedCount = workspaceInvitationRepository.deleteByStatusInAndCreatedAtBefore(
				List.of(InvitationStatus.EXPIRED, InvitationStatus.REJECTED, InvitationStatus.ACCEPTED),
				threshold
		);

		log.info("Purged {} old/expired workspace invitations.", deletedCount);
	}
}

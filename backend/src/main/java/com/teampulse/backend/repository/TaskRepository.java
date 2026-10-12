package com.teampulse.backend.repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import com.teampulse.backend.model.Task;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {

	@Query("SELECT t FROM Task t LEFT JOIN FETCH t.creator LEFT JOIN FETCH t.assignee WHERE t.workspace.id = :workspaceId")
	Page<Task> findByWorkspaceId(@Param("workspaceId") UUID workspaceId, Pageable pageable);

	List<Task> findByWorkspaceId(UUID workspaceId);

	@Query(value = "SELECT t.status, COUNT(t.id) FROM tasks t WHERE t.deleted = false AND t.workspace_id = :workspaceId " +
			"AND (CAST(:status AS varchar) IS NULL OR t.status = CAST(:status AS varchar)) " +
			"AND (CAST(:priority AS varchar) IS NULL OR t.priority = CAST(:priority AS varchar) OR (CAST(:priority AS varchar) = 'MEDIUM' AND t.priority IS NULL)) " +
			"AND (CAST(:assigneeId AS uuid) IS NULL OR t.assignee_id = CAST(:assigneeId AS uuid)) " +
			"GROUP BY t.status", nativeQuery = true)
	List<Object[]> countTasksByStatusFiltered(
			@Param("workspaceId") UUID workspaceId,
			@Param("status") String status,
			@Param("priority") String priority,
			@Param("assigneeId") UUID assigneeId);

	@Query(value = "SELECT COALESCE(t.priority, 'MEDIUM'), COUNT(t.id) FROM tasks t WHERE t.deleted = false AND t.workspace_id = :workspaceId " +
			"AND (CAST(:status AS varchar) IS NULL OR t.status = CAST(:status AS varchar)) " +
			"AND (CAST(:priority AS varchar) IS NULL OR t.priority = CAST(:priority AS varchar) OR (CAST(:priority AS varchar) = 'MEDIUM' AND t.priority IS NULL)) " +
			"AND (CAST(:assigneeId AS uuid) IS NULL OR t.assignee_id = CAST(:assigneeId AS uuid)) " +
			"GROUP BY COALESCE(t.priority, 'MEDIUM')", nativeQuery = true)
	List<Object[]> countTasksByPriorityFiltered(
			@Param("workspaceId") UUID workspaceId,
			@Param("status") String status,
			@Param("priority") String priority,
			@Param("assigneeId") UUID assigneeId);

	@Query(value = "SELECT t.assignee_id, t.status, COUNT(t.id) FROM tasks t WHERE t.deleted = false AND t.workspace_id = :workspaceId " +
			"AND (CAST(:status AS varchar) IS NULL OR t.status = CAST(:status AS varchar)) " +
			"AND (CAST(:priority AS varchar) IS NULL OR t.priority = CAST(:priority AS varchar) OR (CAST(:priority AS varchar) = 'MEDIUM' AND t.priority IS NULL)) " +
			"AND (CAST(:assigneeId AS uuid) IS NULL OR t.assignee_id = CAST(:assigneeId AS uuid)) " +
			"GROUP BY t.assignee_id, t.status", nativeQuery = true)
	List<Object[]> countTasksByAssigneeAndStatusFiltered(
			@Param("workspaceId") UUID workspaceId,
			@Param("status") String status,
			@Param("priority") String priority,
			@Param("assigneeId") UUID assigneeId);

	@Query(value = "SELECT CAST(DATE(t.updated_at) AS varchar), COUNT(t.id) FROM tasks t WHERE t.deleted = false AND t.workspace_id = :workspaceId " +
			"AND t.status = 'DONE' " +
			"AND (CAST(:status AS varchar) IS NULL OR t.status = CAST(:status AS varchar)) " +
			"AND (CAST(:priority AS varchar) IS NULL OR t.priority = CAST(:priority AS varchar) OR (CAST(:priority AS varchar) = 'MEDIUM' AND t.priority IS NULL)) " +
			"AND (CAST(:assigneeId AS uuid) IS NULL OR t.assignee_id = CAST(:assigneeId AS uuid)) " +
			"AND (CAST(:startInstant AS timestamp) IS NULL OR t.updated_at >= CAST(:startInstant AS timestamp)) " +
			"AND (CAST(:endInstant AS timestamp) IS NULL OR t.updated_at < CAST(:endInstant AS timestamp)) " +
			"GROUP BY DATE(t.updated_at)", nativeQuery = true)
	List<Object[]> countCompletedTasksPerDayFiltered(
			@Param("workspaceId") UUID workspaceId,
			@Param("status") String status,
			@Param("priority") String priority,
			@Param("assigneeId") UUID assigneeId,
			@Param("startInstant") Instant startInstant,
			@Param("endInstant") Instant endInstant);

	@Query(value = "SELECT MIN(COALESCE(t.created_at, t.updated_at)) FROM tasks t WHERE t.deleted = false AND t.workspace_id = :workspaceId " +
			"AND (CAST(:status AS varchar) IS NULL OR t.status = CAST(:status AS varchar)) " +
			"AND (CAST(:priority AS varchar) IS NULL OR t.priority = CAST(:priority AS varchar) OR (CAST(:priority AS varchar) = 'MEDIUM' AND t.priority IS NULL)) " +
			"AND (CAST(:assigneeId AS uuid) IS NULL OR t.assignee_id = CAST(:assigneeId AS uuid))", nativeQuery = true)
	Instant findEarliestTaskInstantFiltered(
			@Param("workspaceId") UUID workspaceId,
			@Param("status") String status,
			@Param("priority") String priority,
			@Param("assigneeId") UUID assigneeId);

	@Modifying
	@Query("UPDATE Task t SET t.assignee = NULL WHERE t.assignee.id = :userId")
	void unassignTasksByUserId(@Param("userId") UUID userId);
}
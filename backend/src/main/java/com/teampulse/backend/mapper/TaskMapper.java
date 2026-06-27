package com.teampulse.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import com.teampulse.backend.dto.request.TaskCreateRequest;
import com.teampulse.backend.dto.request.TaskStatusUpdateRequest;
import com.teampulse.backend.dto.request.TaskUpdateRequest;
import com.teampulse.backend.dto.response.TaskResponse;
import com.teampulse.backend.model.Task;

@Mapper(
	componentModel="spring",
	unmappedTargetPolicy = ReportingPolicy.IGNORE,
	uses = {UserMapper.class, TaskCommentMapper.class}
)
public interface TaskMapper {
    TaskResponse toResponse(Task task);

    @Mapping (target = "id", ignore = true)
	@Mapping(target = "workspace", ignore = true)
	@Mapping(target = "creator", ignore = true)
	@Mapping(target = "assignee", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Task toEntity(TaskCreateRequest request);

	@Mapping (target = "id", ignore = true)
	@Mapping(target = "workspace", ignore = true)
	@Mapping(target = "creator", ignore = true)
	@Mapping(target = "assignee", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateTaskFromRequest(TaskUpdateRequest request, @MappingTarget Task task);

	@Mapping (target = "id", ignore = true)
	@Mapping(target = "workspace", ignore = true)
	@Mapping(target = "title", ignore = true)
	@Mapping(target = "description", ignore = true)
	@Mapping(target = "priority", ignore = true)
	@Mapping(target = "creator", ignore = true)
	@Mapping(target = "assignee", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
	void updateTaskStatusFromRequest(TaskStatusUpdateRequest request, @MappingTarget Task task);
}
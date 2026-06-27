package com.teampulse.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.teampulse.backend.dto.request.TaskCommentCreateRequest;
import com.teampulse.backend.dto.response.TaskCommentResponse;
import com.teampulse.backend.model.TaskComment;

@Mapper(
	componentModel = "spring",
	unmappedTargetPolicy = ReportingPolicy.IGNORE,
	uses = {UserMapper.class}
)
public interface TaskCommentMapper {
    TaskCommentResponse toResponse(TaskComment comment);

    @Mapping (target = "id", ignore = true)
    @Mapping(target = "task", ignore = true)
    @Mapping(target = "author", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
    TaskComment toEntity(TaskCommentCreateRequest request);
}
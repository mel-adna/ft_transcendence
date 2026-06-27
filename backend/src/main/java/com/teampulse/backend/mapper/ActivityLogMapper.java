package com.teampulse.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.teampulse.backend.dto.response.ActivityLogResponse;
import com.teampulse.backend.model.ActivityLog;

@Mapper (
	componentModel = "spring",
	unmappedTargetPolicy = ReportingPolicy.IGNORE,
	uses = {UserMapper.class}
)
public interface ActivityLogMapper {
	@Mapping (target = "workspaceId", source = "workspace.id")
    ActivityLogResponse toResponse(ActivityLog log);
}

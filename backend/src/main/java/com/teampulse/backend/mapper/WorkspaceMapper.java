package com.teampulse.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import com.teampulse.backend.dto.request.WorkspaceCreateRequest;
import com.teampulse.backend.dto.request.WorkspaceMemberAddRequest;
import com.teampulse.backend.dto.request.WorkspaceMemberRoleUpdateRequest;
import com.teampulse.backend.dto.request.WorkspaceUpdateRequest;
import com.teampulse.backend.dto.response.WorkspaceMemberResponse;
import com.teampulse.backend.dto.response.WorkspaceResponse;
import com.teampulse.backend.model.Workspace;
import com.teampulse.backend.model.WorkspaceMember;

@Mapper (
	componentModel = "spring",
	unmappedTargetPolicy = ReportingPolicy.IGNORE,
	uses = {UserMapper.class}
)
public interface WorkspaceMapper {
    WorkspaceResponse toResponse(Workspace workspace);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "owner", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
    Workspace toEntity(WorkspaceCreateRequest request);

   	@Mapping(target = "id", ignore = true)
	@Mapping(target = "owner", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
    void updateWorkspaceFromRequest(WorkspaceUpdateRequest request, @MappingTarget Workspace workspace);


	
	WorkspaceMemberResponse toMemberResponse(WorkspaceMember member);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "workspace", ignore = true)
	@Mapping(target = "user", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
	WorkspaceMember	toMemberEntity(WorkspaceMemberAddRequest request);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "workspace", ignore = true)
	@Mapping(target = "user", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
	void	updateMemberFromRequest(WorkspaceMemberRoleUpdateRequest request, @MappingTarget WorkspaceMember member);
}
package com.teampulse.backend.mapper;


import com.teampulse.backend.dto.request.SendInvitationRequest;
import com.teampulse.backend.dto.response.WorkspaceInvitationResponse;
import com.teampulse.backend.model.WorkspaceInvitation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(
		componentModel = "spring",
		unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface WorkspaceInvitationMapper {

	@Mapping(source = "workspace.id", target = "workspaceId")
	@Mapping(source = "workspace.name", target = "workspaceName")
	@Mapping(target = "inviterName", expression = "java(getSafeInviterName(invitation))")
	WorkspaceInvitationResponse toResponse(WorkspaceInvitation invitation);

	@Mapping(source = "email", target = "inviteeEmail")
	@Mapping(target = "id", ignore = true)
	@Mapping(target = "workspace", ignore = true)
	@Mapping(target = "inviter", ignore = true)
	@Mapping(target = "status", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "expiresAt", ignore = true)
	WorkspaceInvitation toEntity(SendInvitationRequest request);

	default String getSafeInviterName(WorkspaceInvitation invitation) {
		if (invitation == null || invitation.getInviter() == null) {
			return "Deleted User";
		}
		String first = invitation.getInviter().getFirstName() != null ? invitation.getInviter().getFirstName().trim() : "";
		String last = invitation.getInviter().getLastName() != null ? invitation.getInviter().getLastName().trim() : "";
		String full = (first + " " + last).trim();
		return full.isEmpty() ? invitation.getInviter().getEmail() : full;
	}
}
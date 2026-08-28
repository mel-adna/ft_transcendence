package com.teampulse.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.teampulse.backend.dto.request.ChatMessageCreateRequest;
import com.teampulse.backend.dto.response.ChatMessageResponse;
import com.teampulse.backend.model.ChatMessage;

@Mapper(
	componentModel = "spring",
	unmappedTargetPolicy = ReportingPolicy.IGNORE,
	uses = {UserMapper.class}
)
public interface ChatMessageMapper {
	ChatMessageResponse toResponse(ChatMessage message);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "workspace", ignore = true)
	@Mapping(target = "sender", ignore = true)
	@Mapping(target = "senderName", ignore = true)
	@Mapping(target = "senderAvatarUrl", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	ChatMessage toEntity(ChatMessageCreateRequest request);
}
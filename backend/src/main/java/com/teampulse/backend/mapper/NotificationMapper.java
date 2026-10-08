package com.teampulse.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import com.teampulse.backend.dto.response.NotificationResponse;
import com.teampulse.backend.model.Notification;

@Mapper(
	componentModel = "spring",
	unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface NotificationMapper {
    NotificationResponse toResponse(Notification notification);
}
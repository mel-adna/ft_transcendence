package com.teampulse.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import com.teampulse.backend.dto.request.ProfileUpdateRequest;
import com.teampulse.backend.dto.request.SignupRequest;
import com.teampulse.backend.dto.response.UserResponse;
import com.teampulse.backend.model.User;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {
	UserResponse toResponse(User user);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "passwordHashed", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
	User toEntity(SignupRequest request);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "email", ignore = true)
	@Mapping(target = "passwordHashed", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
	void updateUserFromRequest(ProfileUpdateRequest request, @MappingTarget User user);
}

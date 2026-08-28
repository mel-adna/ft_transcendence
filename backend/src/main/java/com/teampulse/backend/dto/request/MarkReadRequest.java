package com.teampulse.backend.dto.request;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class MarkReadRequest {
    @NotEmpty(message = "Notification IDs list cannot be empty")
    private List<UUID> notificationIds;
}
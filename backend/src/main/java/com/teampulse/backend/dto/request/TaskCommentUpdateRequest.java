package com.teampulse.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskCommentUpdateRequest {

    @NotBlank(message = "Comment content cannot be empty")
    @Size(max = 2000, message = "Comment content cannot exceed 2000 characters")
    private String content;
}
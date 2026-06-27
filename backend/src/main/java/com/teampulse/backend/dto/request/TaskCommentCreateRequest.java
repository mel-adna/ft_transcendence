package com.teampulse.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class TaskCommentCreateRequest {
	@NotBlank(message="Comment content cannot be empty")
    @Size(max=2000, message="Comment must not exceed 2000 characters")
    private String content;
}

package com.teampulse.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ChatMessageCreateRequest {
	@NotBlank(message="Message content cannot be empty")
    @Size(max=2000, message="Message must not exceed 2000 characters")
    private String content;
}

package com.teampulse.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

@Configuration
public class OpenApiConfig {
	@Bean
	public OpenAPI teamPulseOpenApi() {
		final String securitySchemeName = "bearerAuth";

		return new OpenAPI()
					.info(new Info()
							.title("Team-Pulse Dashboard API")
							.version("1.0")
							.description("Backend RESTful API documentation for Team-Pulse Task Management and Collaboration Platform."))
					.addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
					.components(new Components()
							.addSecuritySchemes(securitySchemeName,
									new SecurityScheme()
											.name(securitySchemeName)
											.type(SecurityScheme.Type.HTTP)
											.scheme("bearer")
											.bearerFormat("JWT")
											.description("Enter your JWT Access Token to access secured endpoints.")));
	}
}

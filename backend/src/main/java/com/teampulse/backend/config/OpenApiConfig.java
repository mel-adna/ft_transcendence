package com.teampulse.backend.config;

import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Profile;


@Configuration
public class OpenApiConfig {

	@Bean
	public OpenAPI teamPulseOpenApi() {
		final String jwtSchemeName = "bearerAuth";
		final String apiKeySchemeName = "apiKeyAuth";

		return new OpenAPI()
				.info(new Info()
						.title("Team-Pulse Dashboard API")
						.version("1.0")
						.description("Backend RESTful API documentation for Team-Pulse Task Management and Collaboration Platform."))
				.addSecurityItem(new SecurityRequirement()
						.addList(jwtSchemeName)
						.addList(apiKeySchemeName))
				.components(new Components()
						.addSecuritySchemes(jwtSchemeName,
								new SecurityScheme()
										.name(jwtSchemeName)
										.type(SecurityScheme.Type.HTTP)
										.scheme("bearer")
										.bearerFormat("JWT")
										.description("Enter your JWT Access Token to access secured endpoints."))
						.addSecuritySchemes(apiKeySchemeName,
								new SecurityScheme()
										.name("X-API-KEY")
										.type(SecurityScheme.Type.APIKEY)
										.in(SecurityScheme.In.HEADER)
										.description("Enter your Public API Key")));
	}


	@Bean
	public GroupedOpenApi publicApi() {
		return GroupedOpenApi.builder()
				.group("public-api")
				.displayName("Public API")
				.pathsToMatch("/public/**")
				.build();
	}


	@Bean
	@Profile({"dev", "local"})
	public GroupedOpenApi internalApi() {
		return GroupedOpenApi.builder()
				.group("internal-api")
				.displayName("Full Internal API")
				.pathsToMatch("/**")
				.pathsToExclude("/public/**")
				.build();
	}
}

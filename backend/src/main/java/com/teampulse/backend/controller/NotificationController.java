package com.teampulse.backend.controller;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.teampulse.backend.dto.response.ErrorResponse;
import com.teampulse.backend.dto.response.NotificationResponse;
import com.teampulse.backend.service.NotificationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@Tag(name = "Notification Management", description = "High-performance production endpoints for retrieving and mutating user notification states.")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notificationService;


    @Operation(
        summary = "Get paginated notification history (Slice)", 
        description = "Retrieves the complete notification history (both read and unread) for the currently authenticated user, paginated via a high-performance slice to avoid heavy database COUNT overhead."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Notification slice successfully retrieved."),
        @ApiResponse(responseCode = "401", description = "Full authentication is required to access this resource.", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
	@GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Slice<NotificationResponse>> getAllUserNotifications(
            @PageableDefault(size = 15) Pageable pageable,
            @Parameter(hidden = true) Principal principal) {
        
        log.info("[REST Request] User '{}' is fetching paginated notification history with page size: {}", principal.getName(), pageable.getPageSize());
        Slice<NotificationResponse> slice = notificationService.getUserNotifications(principal.getName(), pageable);
        return ResponseEntity.ok(slice);
    }


    @Operation(
        summary = "Get unread notifications queue", 
        description = "Retrieves a lightweight list of unread notifications specifically structured to populate the user's real-time navbar notification dropdown."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Unread notifications queue successfully retrieved.")
    })
	@GetMapping(value = "/unread", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<NotificationResponse>> getUnreadNotifications(
            @Parameter(hidden = true) Principal principal) {
        
        log.info("[REST Request] User '{}' is fetching unread notifications dropdown payload.", principal.getName());
        List<NotificationResponse> unreadList = notificationService.getUnreadNotifications(principal.getName());
        return ResponseEntity.ok(unreadList);
    }



    @Operation(
        summary = "Get unread count badge counter", 
        description = "Executes an optimized, ultra-lightweight direct database count query to return the total number of unread items for immediate UI badge updating."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Unread badge count successfully calculated.")
    })
	@GetMapping(value = "/unread-count", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Long> getUnreadCount(
            @Parameter(hidden = true) Principal principal) {
        
        log.info("[REST Request] User '{}' requested real-time unread badge count.", principal.getName());
        long count = notificationService.getUnreadCount(principal.getName());
        return ResponseEntity.ok(count);
    }



    @Operation(
        summary = "Mark a specific notification as read", 
        description = "Updates the state of a single notification to read using its UUID. Enforces strict backend authorization checks to completely prevent cross-user cross-tenant data manipulation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Notification status successfully updated to read. Returns no payload body."),
        @ApiResponse(responseCode = "403", description = "Access denied. Target resource does not belong to the active session user context.", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "404", description = "The target notification resource could not be found with the provided UUID identifier.", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
	@PatchMapping(value = "/{id}/read")
    public ResponseEntity<Void> markNotificationAsRead(
            @Parameter(name = "id", description = "The unique UUID of the target notification resource", required = true, in = ParameterIn.PATH)
            @PathVariable UUID id, 
            @Parameter(hidden = true) Principal principal) {
        
        log.info("[REST Request] User '{}' requested state transition to read for notification ID: {}", principal.getName(), id);
        notificationService.markAsRead(id, principal.getName());
        return ResponseEntity.noContent().build(); // HTTP standard 204 No Content for successful void mutations
    }



    @Operation(
        summary = "Bulk mark all notifications as read", 
        description = "Leverages a single high-performance bulk database modification update query to catch up and transition all current unread notifications for the user into read status at once."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "All user notifications successfully synchronized to read status.")
    })
	@PutMapping(value = "/read-all")
    public ResponseEntity<Void> markAllNotificationsAsRead(
            @Parameter(hidden = true) Principal principal) {
        
        log.info("[REST Request] User '{}' triggered bulk 'Mark All as Read' high-performance modification pipeline.", principal.getName());
        notificationService.markAllAsRead(principal.getName());
        return ResponseEntity.noContent().build();
    }
}

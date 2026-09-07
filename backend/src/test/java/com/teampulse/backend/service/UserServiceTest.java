package com.teampulse.backend.service;

import com.teampulse.backend.dto.request.SignupRequest;
import com.teampulse.backend.dto.request.VerifyEmailRequest;
import com.teampulse.backend.dto.response.AuthResponse;
import com.teampulse.backend.dto.response.UserResponse;
import com.teampulse.backend.mapper.UserMapper;
import com.teampulse.backend.model.RefreshToken;
import com.teampulse.backend.model.User;
import com.teampulse.backend.model.VerificationCode;
import com.teampulse.backend.repository.UserRepository;
import com.teampulse.backend.repository.VerificationCodeRepository;
import com.teampulse.backend.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private VerificationCodeRepository verificationCodeRepository;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private UserMapper userMapper;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private UserService userService;

    private SignupRequest testSignupRequest;
    private User testUser;
    private VerificationCode testVerificationCode;

    @BeforeEach
    void setup() {
        testSignupRequest = new SignupRequest();
        testSignupRequest.setFirstName("med");
        testSignupRequest.setLastName("test");
        testSignupRequest.setEmail("Med@gmail.com");
        testSignupRequest.setPassword("Hello123World#");

        testUser = User.builder()
                .id(UUID.randomUUID())
                .firstName("med")
                .lastName("test")
                .email("Med@gmail.com")
                .enabled(false)
                .build();

        testVerificationCode = VerificationCode.builder()
                .id(UUID.randomUUID())
                .code("613011")
                .user(testUser)
                .expiryDate(Instant.now().plusMillis(15 * 60))
                .build();
    }

    @Test
    @DisplayName("Should successfully signup user and send verification email")
    void signup_Success() {
        when(userRepository.findByEmail(any(String.class)))
                .thenReturn(Optional.empty());

        when(passwordEncoder.encode(any(String.class)))
                .thenReturn("hashed_password_123");

        when(userRepository.save(any(User.class)))
                .thenAnswer(invocation -> {
                    User userToSave = invocation.getArgument(0);
                    userToSave.setId(UUID.randomUUID());
                    return userToSave;
                });

        var response = userService.signup(testSignupRequest);

        assertNotNull(response);

        verify(userRepository, times(1)).findByEmail(any(String.class));
        verify(passwordEncoder, times(1)).encode(any(String.class));
        verify(userRepository, times(1)).save(any(User.class));
        verify(verificationCodeRepository, times(1)).deleteByUser(any(User.class));
        verify(verificationCodeRepository, times(1)).save(any(VerificationCode.class));

        verifyNoInteractions(jwtUtils);
        verifyNoInteractions(refreshTokenService);
    }

    @Test
    @DisplayName("Should successfully verify email and return auth tokens")
    void verifyEmail_Success() {
        VerifyEmailRequest verifyRequest = new VerifyEmailRequest("Med@gmail.com", "613011");

        when(userRepository.findByEmail("Med@gmail.com"))
                .thenReturn(Optional.of(testUser));

        when(verificationCodeRepository.findByCodeAndUser("613011", testUser))
                .thenReturn(Optional.of(testVerificationCode));

        when(jwtUtils.generateToken(any())).thenReturn("access_token_test");

        RefreshToken refreshTokenTest = RefreshToken.builder()
                .token("refresh_token_test")
                .build();

        when(refreshTokenService.createRefreshToken(any(User.class)))
                .thenReturn(refreshTokenTest);

        UserResponse userResponseTest = UserResponse.builder()
                .id(testUser.getId())
                .firstName(testUser.getFirstName())
                .lastName(testUser.getLastName())
                .email(testUser.getEmail())
                .build();

        when(userMapper.toResponse(any(User.class))).thenReturn(userResponseTest);

        AuthResponse response = userService.verifyEmail(verifyRequest);

        assertNotNull(response);
        assertEquals("access_token_test", response.getAccessToken());
        assertEquals("refresh_token_test", response.getRefreshToken());
        assertEquals(testUser.getEmail(), response.getUser().getEmail());

        verify(jwtUtils, times(1)).generateToken(any());
        verify(refreshTokenService, times(1)).createRefreshToken(any(User.class));
        verify(verificationCodeRepository, times(1)).findByCodeAndUser("613011", testUser);
    }
}
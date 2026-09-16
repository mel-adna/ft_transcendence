@Transactional
public AuthResponse googleLogin(GoogleLoginRequest request) {
	try {
		GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
				new NetHttpTransport(),
				GsonFactory.getDefaultInstance())
				.setAudience(Collections.singletonList(googleClientId))
				.build();

		GoogleIdToken idToken = verifier.verify(request.getIdToken());
		if (idToken == null) {
			throw new BadCredentialsException("Invalid Google ID Token");
		}

		GoogleIdToken.Payload payload = idToken.getPayload();

		String email = payload.getEmail();
		String googleId = payload.getSubject();
		String firstName = (String) payload.get("given_name");
		String lastName = (String) payload.get("family_name");
		String pictureUrl = (String) payload.get("picture");

		AtomicBoolean isNewSignup = new AtomicBoolean(false);

		User user = userRepository.findByEmail(email)
				.map(existingUser -> {
					if (existingUser.getProvider() == AuthProvider.LOCAL) {
						existingUser.setProvider(AuthProvider.GOOGLE);
						existingUser.setProviderId(googleId);
						existingUser.setEnabled(true);
						if (existingUser.getAvatarUrl() == null) {
							existingUser.setAvatarUrl(pictureUrl);
						}
						isNewSignup.set(true);
						return userRepository.save(existingUser);
					}
					return existingUser;
				})
				.orElseGet(() -> {
					isNewSignup.set(true);
					return userRepository.save(
							User.builder()
									.email(email)
									.firstName(firstName)
									.lastName(lastName)
									.avatarUrl(pictureUrl)
									.provider(AuthProvider.GOOGLE)
									.providerId(googleId)
									.enabled(true)
									.build());
				});

		// Publish Welcome Event immediately for Google Signups
		if (isNewSignup.get()) {
			eventPublisher.publishEvent(new UserWelcomeEvent(user.getEmail(), user.getFirstName()));
		}

		UserPrincipal userPrincipal = new UserPrincipal(user);
		String accessToken = jwtUtils.generateToken(userPrincipal);

		refreshTokenService.deleteByUserId(user);
		RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

		return AuthResponse.builder()
				.accessToken(accessToken)
				.refreshToken(refreshToken.getToken())
				.user(userMapper.toResponse(user))
				.build();

	} catch (Exception e) {
		throw new BadCredentialsException("Failed to authenticate with Google: " + e.getMessage());
	}
}
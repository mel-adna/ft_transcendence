package com.teampulse.backend.security.utils;


import java.util.Locale;

public final class EmailUtils {

	private EmailUtils() {
	}

	public static String normalize(String email) {
		if (email == null) {
			return null;
		}
		return email.trim().toLowerCase(Locale.ROOT);
	}

	public static String maskEmail(String email) {
		if (email == null || !email.contains("@")) {
			return "***";
		}
		int atIndex = email.indexOf('@');
		if (atIndex <= 2) {
			return "***" + email.substring(atIndex);
		}
		return email.substring(0, 2) + "***" + email.substring(atIndex);
	}
}
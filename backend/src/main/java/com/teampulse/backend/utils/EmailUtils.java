package com.teampulse.backend.utils;


public final class EmailUtils {

	private EmailUtils() {
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
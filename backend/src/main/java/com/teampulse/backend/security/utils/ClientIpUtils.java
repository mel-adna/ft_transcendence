package com.teampulse.backend.security.utils;

import jakarta.servlet.http.HttpServletRequest;

public class ClientIpUtils {
	private ClientIpUtils() {}

	public static String getClientIp(HttpServletRequest request) {
		if (request == null)
			return "0.0.0.0";

		String ip = request.getHeader("X-Real-IP");

		if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
			String forwarded = request.getHeader("X-Forwarded-For");
			if (forwarded != null && !forwarded.isBlank())
				ip = forwarded.split(",")[0].trim();
		}

		if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip))
			ip = request.getRemoteAddr();

		return ip;
	}
}

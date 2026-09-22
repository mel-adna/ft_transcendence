package com.teampulse.backend.exception;

public class AccountNotVerifiedException extends RuntimeException {
	public AccountNotVerifiedException(String message) {
		super(message);
	}
}

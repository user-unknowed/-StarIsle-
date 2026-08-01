package com.starisle.exception;

public class EncryptionException extends RuntimeException {

    private final String keyVersion;
    private final String operation;

    public EncryptionException(String message) {
        super(message);
        this.keyVersion = null;
        this.operation = null;
    }

    public EncryptionException(String message, Throwable cause) {
        super(message, cause);
        this.keyVersion = null;
        this.operation = null;
    }

    public EncryptionException(String keyVersion, String operation, String message) {
        super(message);
        this.keyVersion = keyVersion;
        this.operation = operation;
    }

    public EncryptionException(String keyVersion, String operation, String message, Throwable cause) {
        super(message, cause);
        this.keyVersion = keyVersion;
        this.operation = operation;
    }

    public String getKeyVersion() {
        return keyVersion;
    }

    public String getOperation() {
        return operation;
    }
}

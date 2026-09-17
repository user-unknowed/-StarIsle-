package com.starisle.exception;

/**
 * 加密操作异常
 * 在加密/解密、密钥轮换等操作失败时抛出，携带密钥版本与操作类型等上下文，
 * 便于全局异常处理器向调用方返回详细错误信息。
 */
public class EncryptionException extends RuntimeException {

    // 出错的密钥版本
    private final String keyVersion;
    // 出错的操作类型（encrypt/decrypt 等）
    private final String operation;

    /**
     * 仅使用错误消息构造异常
     *
     * @param message 错误消息
     */
    public EncryptionException(String message) {
        super(message);
        this.keyVersion = null;
        this.operation = null;
    }

    /**
     * 使用错误消息与原因构造异常
     *
     * @param message 错误消息
     * @param cause   原始异常
     */
    public EncryptionException(String message, Throwable cause) {
        super(message, cause);
        this.keyVersion = null;
        this.operation = null;
    }

    /**
     * 使用密钥版本与操作类型构造异常
     *
     * @param keyVersion 密钥版本
     * @param operation  操作类型
     * @param message    错误消息
     */
    public EncryptionException(String keyVersion, String operation, String message) {
        super(message);
        this.keyVersion = keyVersion;
        this.operation = operation;
    }

    /**
     * 使用密钥版本、操作类型与原因构造异常
     *
     * @param keyVersion 密钥版本
     * @param operation  操作类型
     * @param message    错误消息
     * @param cause       原始异常
     */
    public EncryptionException(String keyVersion, String operation, String message, Throwable cause) {
        super(message, cause);
        this.keyVersion = keyVersion;
        this.operation = operation;
    }

    /**
     * 获取出错的密钥版本
     *
     * @return 密钥版本
     */
    public String getKeyVersion() {
        return keyVersion;
    }

    /**
     * 获取出错的操作类型
     *
     * @return 操作类型
     */
    public String getOperation() {
        return operation;
    }
}

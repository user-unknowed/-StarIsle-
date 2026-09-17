package com.starisle.exception;

/**
 * 数据迁移异常
 * 在数据迁移过程中出现失败时抛出，携带表名、记录 ID 与操作类型等上下文，
 * 便于全局异常处理器向调用方返回详细错误信息。
 */
public class MigrationException extends RuntimeException {

    // 出错的表名
    private final String tableName;
    // 出错的记录 ID
    private final String recordId;
    // 出错的操作类型（insert/update/delete 等）
    private final String operation;

    /**
     * 仅使用错误消息构造异常
     *
     * @param message 错误消息
     */
    public MigrationException(String message) {
        super(message);
        this.tableName = null;
        this.recordId = null;
        this.operation = null;
    }

    /**
     * 使用错误消息与原因构造异常
     *
     * @param message 错误消息
     * @param cause   原始异常
     */
    public MigrationException(String message, Throwable cause) {
        super(message, cause);
        this.tableName = null;
        this.recordId = null;
        this.operation = null;
    }

    /**
     * 使用迁移上下文构造异常
     *
     * @param tableName 表名
     * @param recordId  记录 ID
     * @param operation 操作类型
     * @param message   错误消息
     */
    public MigrationException(String tableName, String recordId, String operation, String message) {
        super(message);
        this.tableName = tableName;
        this.recordId = recordId;
        this.operation = operation;
    }

    /**
     * 使用迁移上下文与原因构造异常
     *
     * @param tableName 表名
     * @param recordId  记录 ID
     * @param operation 操作类型
     * @param message   错误消息
     * @param cause     原始异常
     */
    public MigrationException(String tableName, String recordId, String operation, String message, Throwable cause) {
        super(message, cause);
        this.tableName = tableName;
        this.recordId = recordId;
        this.operation = operation;
    }

    /**
     * 获取出错表名
     *
     * @return 表名
     */
    public String getTableName() {
        return tableName;
    }

    /**
     * 获取出错记录 ID
     *
     * @return 记录 ID
     */
    public String getRecordId() {
        return recordId;
    }

    /**
     * 获取操作类型
     *
     * @return 操作类型
     */
    public String getOperation() {
        return operation;
    }
}

package com.starisle.exception;

public class MigrationException extends RuntimeException {

    private final String tableName;
    private final String recordId;
    private final String operation;

    public MigrationException(String message) {
        super(message);
        this.tableName = null;
        this.recordId = null;
        this.operation = null;
    }

    public MigrationException(String message, Throwable cause) {
        super(message, cause);
        this.tableName = null;
        this.recordId = null;
        this.operation = null;
    }

    public MigrationException(String tableName, String recordId, String operation, String message) {
        super(message);
        this.tableName = tableName;
        this.recordId = recordId;
        this.operation = operation;
    }

    public MigrationException(String tableName, String recordId, String operation, String message, Throwable cause) {
        super(message, cause);
        this.tableName = tableName;
        this.recordId = recordId;
        this.operation = operation;
    }

    public String getTableName() {
        return tableName;
    }

    public String getRecordId() {
        return recordId;
    }

    public String getOperation() {
        return operation;
    }
}

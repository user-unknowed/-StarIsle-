package com.starisle.config;

import com.starisle.dto.ApiResponse;
import com.starisle.exception.EncryptionException;
import com.starisle.exception.MigrationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationExceptions(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        return ResponseEntity.ok(ApiResponse.<Map<String, String>>builder()
                .code(400)
                .message("参数验证失败")
                .data(errors)
                .build());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException ex) {
        return ResponseEntity.ok(ApiResponse.badRequest(ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException ex) {
        return ResponseEntity.ok(ApiResponse.forbidden("无权访问"));
    }

    @ExceptionHandler(MigrationException.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleMigrationException(MigrationException ex) {
        Map<String, Object> errorDetails = new HashMap<>();
        errorDetails.put("table", ex.getTableName());
        errorDetails.put("recordId", ex.getRecordId());
        errorDetails.put("operation", ex.getOperation());

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<Map<String, Object>>builder()
                        .code(500)
                        .message("数据迁移失败: " + ex.getMessage())
                        .data(errorDetails)
                        .build());
    }

    @ExceptionHandler(EncryptionException.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleEncryptionException(EncryptionException ex) {
        Map<String, Object> errorDetails = new HashMap<>();
        errorDetails.put("keyVersion", ex.getKeyVersion());
        errorDetails.put("operation", ex.getOperation());

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<Map<String, Object>>builder()
                        .code(500)
                        .message("加密操作失败: " + ex.getMessage())
                        .data(errorDetails)
                        .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.internalError("服务器内部错误"));
    }
}
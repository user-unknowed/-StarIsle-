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

/**
 * 全局异常处理类
 * 通过 {@link RestControllerAdvice} 统一捕获 Controller 抛出的异常，
 * 将其转换为标准 {@link ApiResponse} 响应结构，避免异常堆栈直接暴露给前端。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 处理请求参数校验失败异常
     *
     * @param ex 参数校验异常
     * @return 包含字段错误信息的统一响应
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationExceptions(
            MethodArgumentNotValidException ex) {
        // 收集每个字段对应的错误信息
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        // 返回 400 状态码及字段错误明细
        return ResponseEntity.ok(ApiResponse.<Map<String, String>>builder()
                .code(400)
                .message("参数验证失败")
                .data(errors)
                .build());
    }

    /**
     * 处理非法参数异常
     *
     * @param ex 非法参数异常
     * @return 包含错误信息的统一响应
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException ex) {
        // 将非法参数异常转换为 400 响应
        return ResponseEntity.ok(ApiResponse.badRequest(ex.getMessage()));
    }

    /**
     * 处理访问被拒绝（无权限）异常
     *
     * @param ex 访问拒绝异常
     * @return 包含提示信息的统一响应
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException ex) {
        // 返回无权访问提示
        return ResponseEntity.ok(ApiResponse.forbidden("无权访问"));
    }

    /**
     * 处理数据迁移异常
     *
     * @param ex 数据迁移异常
     * @return 包含表名、记录 ID、操作类型等明细的统一响应
     */
    @ExceptionHandler(MigrationException.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleMigrationException(MigrationException ex) {
        // 组装迁移失败上下文信息
        Map<String, Object> errorDetails = new HashMap<>();
        errorDetails.put("table", ex.getTableName());
        errorDetails.put("recordId", ex.getRecordId());
        errorDetails.put("operation", ex.getOperation());

        // 返回 500 状态码及迁移失败明细
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<Map<String, Object>>builder()
                        .code(500)
                        .message("数据迁移失败: " + ex.getMessage())
                        .data(errorDetails)
                        .build());
    }

    /**
     * 处理加密操作异常
     *
     * @param ex 加密异常
     * @return 包含密钥版本与操作类型的统一响应
     */
    @ExceptionHandler(EncryptionException.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleEncryptionException(EncryptionException ex) {
        // 组装加密失败上下文信息
        Map<String, Object> errorDetails = new HashMap<>();
        errorDetails.put("keyVersion", ex.getKeyVersion());
        errorDetails.put("operation", ex.getOperation());

        // 返回 500 状态码及加密失败明细
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<Map<String, Object>>builder()
                        .code(500)
                        .message("加密操作失败: " + ex.getMessage())
                        .data(errorDetails)
                        .build());
    }

    /**
     * 兜底处理所有未捕获的异常
     *
     * @param ex 通用异常
     * @return 包含通用错误提示的统一响应
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        // 返回服务器内部错误提示
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.internalError("服务器内部错误"));
    }
}

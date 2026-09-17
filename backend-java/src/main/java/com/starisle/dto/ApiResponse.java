package com.starisle.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * 统一响应 DTO
 * 用于所有 REST 接口返回统一结构的 {code, message, data, requestId, timestamp} 数据，
 * 同时提供常用状态码的快捷构造方法。
 *
 * @param <T> 业务数据类型
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    // 业务状态码
    private Integer code;
    // 提示信息
    private String message;
    // 业务数据
    private T data;
    // 请求 ID，便于链路追踪
    private String requestId;
    // 响应时间戳
    private LocalDateTime timestamp;

    /**
     * 构造成功响应（默认消息 success）
     *
     * @param data 业务数据
     * @param <T>  数据类型
     * @return 统一响应
     */
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .code(200)
                .message("success")
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * 构造成功响应（自定义消息）
     *
     * @param message 提示信息
     * @param data    业务数据
     * @param <T>     数据类型
     * @return 统一响应
     */
    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .code(200)
                .message(message)
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * 构造 201 创建成功响应
     *
     * @param data 业务数据
     * @param <T>  数据类型
     * @return 统一响应
     */
    public static <T> ApiResponse<T> created(T data) {
        return ApiResponse.<T>builder()
                .code(201)
                .message("created")
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * 构造 201 创建成功响应（自定义消息）
     *
     * @param message 提示信息
     * @param data    业务数据
     * @param <T>     数据类型
     * @return 统一响应
     */
    public static <T> ApiResponse<T> created(String message, T data) {
        return ApiResponse.<T>builder()
                .code(201)
                .message(message)
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * 构造通用错误响应
     *
     * @param code    状态码
     * @param message 提示信息
     * @param <T>     数据类型
     * @return 统一响应
     */
    public static <T> ApiResponse<T> error(Integer code, String message) {
        return ApiResponse.<T>builder()
                .code(code)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * 构造 400 错误请求响应
     *
     * @param message 提示信息
     * @param <T>     数据类型
     * @return 统一响应
     */
    public static <T> ApiResponse<T> badRequest(String message) {
        return error(400, message);
    }

    /**
     * 构造 401 未授权响应
     *
     * @param message 提示信息
     * @param <T>     数据类型
     * @return 统一响应
     */
    public static <T> ApiResponse<T> unauthorized(String message) {
        return error(401, message);
    }

    /**
     * 构造 403 拒绝访问响应
     *
     * @param message 提示信息
     * @param <T>     数据类型
     * @return 统一响应
     */
    public static <T> ApiResponse<T> forbidden(String message) {
        return error(403, message);
    }

    /**
     * 构造 404 资源不存在响应
     *
     * @param message 提示信息
     * @param <T>     数据类型
     * @return 统一响应
     */
    public static <T> ApiResponse<T> notFound(String message) {
        return error(404, message);
    }

    /**
     * 构造 500 服务器内部错误响应
     *
     * @param message 提示信息
     * @param <T>     数据类型
     * @return 统一响应
     */
    public static <T> ApiResponse<T> internalError(String message) {
        return error(500, message);
    }
}

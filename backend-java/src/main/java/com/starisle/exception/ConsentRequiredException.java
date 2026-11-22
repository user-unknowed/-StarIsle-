package com.starisle.exception;

import java.util.Map;

/**
 * 未获得本人授权异常
 * 当请求涉及个人数据但用户未授权（或已撤回、已过期）时抛出，
 * 由全局异常处理器转换为 403 + 业务码 40301 的明确响应。
 */
public class ConsentRequiredException extends RuntimeException {

    /** 缺失的同意范围 */
    private final String scope;
    /** 当前隐私政策版本 */
    private final String policyVersion;
    /** 附加说明（如涉及的绑定、学生、原因） */
    private final Map<String, Object> context;

    /**
     * 构造方法
     *
     * @param scope         缺失的同意范围
     * @param policyVersion 当前隐私政策版本
     */
    public ConsentRequiredException(String scope, String policyVersion) {
        this(scope, policyVersion, Map.of());
    }

    /**
     * 构造方法（带附加说明）
     *
     * @param scope         缺失的同意范围
     * @param policyVersion 当前隐私政策版本
     * @param context       附加说明
     */
    public ConsentRequiredException(String scope, String policyVersion, Map<String, Object> context) {
        super("未获得本人对 " + scope + " 的授权");
        this.scope = scope;
        this.policyVersion = policyVersion;
        this.context = context == null ? Map.of() : context;
    }

    /**
     * 获取缺失的同意范围
     *
     * @return 同意范围
     */
    public String getScope() {
        return scope;
    }

    /**
     * 获取当前隐私政策版本
     *
     * @return 政策版本
     */
    public String getPolicyVersion() {
        return policyVersion;
    }

    /**
     * 获取附加说明
     *
     * @return 附加说明
     */
    public Map<String, Object> getContext() {
        return context;
    }
}


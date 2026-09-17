package com.starisle.controller;

import com.starisle.dto.ApiResponse;
import com.starisle.dto.request.BindStudentRequest;
import com.starisle.dto.request.ParentLoginRequest;
import com.starisle.dto.request.ParentRegisterRequest;
import com.starisle.dto.response.ChildBindingResponse;
import com.starisle.dto.response.EmergencyAlertResponse;
import com.starisle.dto.response.EmergencyResourceResponse;
import com.starisle.dto.response.ParentLoginResponse;
import com.starisle.entity.EmergencyAlert;
import com.starisle.entity.EmergencyResource;
import com.starisle.entity.ParentStudentBinding;
import com.starisle.entity.ParentUser;
import com.starisle.service.ParentService;
import com.starisle.utils.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 家长端接口控制器
 * 提供家长注册、登录、当前家长信息查询、学生绑定/解绑/授权、孩子列表与详情查询，
 * 以及紧急预警与紧急资源等接口。
 */
@RestController
@RequestMapping("/api/v1/parents")
@RequiredArgsConstructor
public class ParentController {

    // 家长业务服务
    private final ParentService parentService;
    // JWT 工具类
    private final JwtUtil jwtUtil;

    /**
     * 家长注册接口
     *
     * @HTTP POST /api/v1/parents/register
     * @param request 注册请求
     * @return 含登录令牌的家长登录响应
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<ParentLoginResponse>> register(@Valid @RequestBody ParentRegisterRequest request) {
        try {
            // 调用服务完成家长注册
            ParentUser parent = parentService.register(request.getPhone(), request.getPassword(), request.getNickname());
            // 生成 JWT
            String token = jwtUtil.generateToken(parent.getId(), "parent");

            // 组装登录响应
            ParentLoginResponse response = ParentLoginResponse.builder()
                    .userId(parent.getId())
                    .nickname(parent.getNickname())
                    .phone(parent.getPhone())
                    .token(token)
                    .build();

            return ResponseEntity.ok(ApiResponse.created("家长注册成功", response));
        } catch (IllegalArgumentException e) {
            // 参数非法时返回 400
            return ResponseEntity.ok(ApiResponse.badRequest(e.getMessage()));
        }
    }

    /**
     * 家长登录接口
     *
     * @HTTP POST /api/v1/parents/login
     * @param request 登录请求
     * @return 含登录令牌的家长登录响应
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<ParentLoginResponse>> login(@Valid @RequestBody ParentLoginRequest request) {
        // 校验手机号与密码
        return parentService.login(request.getPhone(), request.getPassword())
                .map(parent -> {
                    // 生成 JWT
                    String token = jwtUtil.generateToken(parent.getId(), "parent");
                    // 组装响应
                    ParentLoginResponse response = ParentLoginResponse.builder()
                            .userId(parent.getId())
                            .nickname(parent.getNickname())
                            .phone(parent.getPhone())
                            .token(token)
                            .build();
                    return ResponseEntity.ok(ApiResponse.success("登录成功", response));
                })
                .orElse(ResponseEntity.ok(ApiResponse.unauthorized("手机号或密码错误")));
    }

    /**
     * 获取当前登录家长信息
     *
     * @HTTP GET /api/v1/parents/me
     * @return 家长信息
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<ParentLoginResponse>> getCurrentUser() {
        String userId = getCurrentUserId();
        // 查询家长信息并组装响应
        return parentService.findById(userId)
                .map(parent -> {
                    ParentLoginResponse response = ParentLoginResponse.builder()
                            .userId(parent.getId())
                            .nickname(parent.getNickname())
                            .phone(parent.getPhone())
                            .avatar(parent.getAvatar())
                            .build();
                    return ResponseEntity.ok(ApiResponse.success(response));
                })
                .orElse(ResponseEntity.ok(ApiResponse.notFound("用户不存在")));
    }

    /**
     * 绑定学生账号
     *
     * @HTTP POST /api/v1/parents/children/bind
     * @param request 绑定请求
     * @return 绑定信息
     */
    @PostMapping("/children/bind")
    public ResponseEntity<ApiResponse<ChildBindingResponse>> bindChild(@Valid @RequestBody BindStudentRequest request) {
        String parentId = getCurrentUserId();
        try {
            // 调用服务创建绑定关系
            ParentStudentBinding binding = parentService.bindStudent(
                    parentId,
                    request.getStudentId(),
                    request.getStudentNickname(),
                    request.getBindType()
            );
            return ResponseEntity.ok(ApiResponse.created("绑定成功", toChildBindingResponse(binding)));
        } catch (IllegalArgumentException e) {
            // 参数非法时返回 400
            return ResponseEntity.ok(ApiResponse.badRequest(e.getMessage()));
        }
    }

    /**
     * 授权学生绑定
     *
     * @HTTP POST /api/v1/parents/children/{bindingId}/authorize
     * @param bindingId 绑定 ID
     * @return 授权后的绑定信息
     */
    @PostMapping("/children/{bindingId}/authorize")
    public ResponseEntity<ApiResponse<ChildBindingResponse>> authorizeBinding(@PathVariable String bindingId) {
        String parentId = getCurrentUserId();

        // 校验绑定归属当前家长后执行授权
        return parentService.getBinding(bindingId)
                .filter(binding -> binding.getParentId().equals(parentId))
                .map(binding -> {
                    ParentStudentBinding updated = parentService.authorizeBinding(bindingId);
                    return ResponseEntity.ok(ApiResponse.success("授权成功", toChildBindingResponse(updated)));
                })
                .orElse(ResponseEntity.ok(ApiResponse.forbidden("无权操作该绑定记录")));
    }

    /**
     * 解绑学生
     *
     * @HTTP DELETE /api/v1/parents/children/{bindingId}
     * @param bindingId 绑定 ID
     * @return 解绑结果
     */
    @DeleteMapping("/children/{bindingId}")
    public ResponseEntity<ApiResponse<Void>> unbindChild(@PathVariable String bindingId) {
        String parentId = getCurrentUserId();

        // 校验归属后执行解绑
        return parentService.getBinding(bindingId)
                .filter(binding -> binding.getParentId().equals(parentId))
                .map(binding -> {
                    parentService.unbindStudent(bindingId);
                    return ResponseEntity.ok(ApiResponse.<Void>success("解除绑定成功", null));
                })
                .orElse(ResponseEntity.ok(ApiResponse.forbidden("无权操作该绑定记录")));
    }

    /**
     * 获取当前家长绑定的所有孩子
     *
     * @HTTP GET /api/v1/parents/children
     * @return 孩子绑定列表
     */
    @GetMapping("/children")
    public ResponseEntity<ApiResponse<List<ChildBindingResponse>>> getChildren() {
        String parentId = getCurrentUserId();
        // 查询并转换为响应
        List<ChildBindingResponse> children = parentService.getChildren(parentId)
                .stream()
                .map(this::toChildBindingResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(children));
    }

    /**
     * 获取指定孩子绑定详情
     *
     * @HTTP GET /api/v1/parents/children/{bindingId}
     * @param bindingId 绑定 ID
     * @return 孩子绑定详情
     */
    @GetMapping("/children/{bindingId}")
    public ResponseEntity<ApiResponse<ChildBindingResponse>> getChild(@PathVariable String bindingId) {
        String parentId = getCurrentUserId();
        // 校验归属后返回详情
        return parentService.getBinding(bindingId)
                .filter(binding -> binding.getParentId().equals(parentId))
                .map(binding -> ResponseEntity.ok(ApiResponse.success(toChildBindingResponse(binding))))
                .orElse(ResponseEntity.ok(ApiResponse.forbidden("无权查看该孩子信息")));
    }

    /**
     * 获取当前家长未处理的紧急预警
     *
     * @HTTP GET /api/v1/parents/emergency/alert
     * @return 紧急预警详情，无则返回 null
     */
    @GetMapping("/emergency/alert")
    public ResponseEntity<ApiResponse<EmergencyAlertResponse>> getActiveAlert() {
        String parentId = getCurrentUserId();
        return parentService.getActiveAlert(parentId)
                .map(alert -> ResponseEntity.ok(ApiResponse.success(toEmergencyAlertResponse(alert))))
                .orElse(ResponseEntity.ok(ApiResponse.success("暂无预警", null)));
    }

    /**
     * 确认紧急预警
     *
     * @HTTP POST /api/v1/parents/emergency/alert/{alertId}/confirm
     * @param alertId 预警 ID
     * @return 确认后的预警详情
     */
    @PostMapping("/emergency/alert/{alertId}/confirm")
    public ResponseEntity<ApiResponse<EmergencyAlertResponse>> confirmAlert(@PathVariable String alertId) {
        String parentId = getCurrentUserId();

        // 校验预警归属后执行确认
        return parentService.getActiveAlert(parentId)
                .filter(alert -> alert.getId().equals(alertId))
                .map(alert -> {
                    EmergencyAlert confirmed = parentService.confirmAlert(alertId);
                    return ResponseEntity.ok(ApiResponse.success("确认成功", toEmergencyAlertResponse(confirmed)));
                })
                .orElse(ResponseEntity.ok(ApiResponse.forbidden("无权确认该预警")));
    }

    /**
     * 获取全部紧急资源列表
     *
     * @HTTP GET /api/v1/parents/emergency/resources
     * @return 紧急资源列表
     */
    @GetMapping("/emergency/resources")
    public ResponseEntity<ApiResponse<List<EmergencyResourceResponse>>> getEmergencyResources() {
        // 查询并转换为响应
        List<EmergencyResourceResponse> resources = parentService.getEmergencyResources()
                .stream()
                .map(this::toEmergencyResourceResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(resources));
    }

    /**
     * 按类型查询紧急资源
     *
     * @HTTP GET /api/v1/parents/emergency/resources/{type}
     * @param type 资源类型
     * @return 紧急资源列表
     */
    @GetMapping("/emergency/resources/{type}")
    public ResponseEntity<ApiResponse<List<EmergencyResourceResponse>>> getResourcesByType(@PathVariable String type) {
        // 按类型查询并转换
        List<EmergencyResourceResponse> resources = parentService.getResourcesByType(type)
                .stream()
                .map(this::toEmergencyResourceResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(resources));
    }

    /**
     * 从 Spring Security 上下文获取当前登录家长 ID
     *
     * @return 当前登录家长 ID
     */
    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getPrincipal().toString() : null;
    }

    /**
     * 将绑定实体转换为响应 DTO
     *
     * @param binding 学生绑定实体
     * @return 孩子绑定响应
     */
    private ChildBindingResponse toChildBindingResponse(ParentStudentBinding binding) {
        return ChildBindingResponse.builder()
                .id(binding.getId())
                .parentId(binding.getParentId())
                .studentId(binding.getStudentId())
                .studentNickname(binding.getStudentNickname())
                .studentAvatar(binding.getStudentAvatar())
                .bindType(binding.getBindType())
                .authorized(binding.getAuthorized())
                .authorizedAt(binding.getAuthorizedAt())
                .latestMood(binding.getLatestMood())
                .riskLevel(binding.getRiskLevel())
                .lastCheckinDate(binding.getLastCheckinDate())
                .createdAt(binding.getCreatedAt())
                .build();
    }

    /**
     * 将紧急预警实体转换为响应 DTO
     *
     * @param alert 预警实体
     * @return 紧急预警响应
     */
    private EmergencyAlertResponse toEmergencyAlertResponse(EmergencyAlert alert) {
        return EmergencyAlertResponse.builder()
                .id(alert.getId())
                .studentId(alert.getStudentId())
                .parentId(alert.getParentId())
                .riskLevel(alert.getRiskLevel())
                .status(alert.getStatus())
                .triggerSource(alert.getTriggerSource())
                .description(alert.getDescription())
                .triggeredAt(alert.getTriggeredAt())
                .confirmedAt(alert.getConfirmedAt())
                .build();
    }

    /**
     * 将紧急资源实体转换为响应 DTO
     *
     * @param resource 资源实体
     * @return 紧急资源响应
     */
    private EmergencyResourceResponse toEmergencyResourceResponse(EmergencyResource resource) {
        return EmergencyResourceResponse.builder()
                .id(resource.getId())
                .type(resource.getType())
                .name(resource.getName())
                .phone(resource.getPhone())
                .address(resource.getAddress())
                .distance(resource.getDistance())
                .description(resource.getDescription())
                .hours(resource.getHours())
                .build();
    }
}

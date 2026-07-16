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

@RestController
@RequestMapping("/api/v1/parents")
@RequiredArgsConstructor
public class ParentController {

    private final ParentService parentService;
    private final JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<ParentLoginResponse>> register(@Valid @RequestBody ParentRegisterRequest request) {
        try {
            ParentUser parent = parentService.register(request.getPhone(), request.getPassword(), request.getNickname());
            String token = jwtUtil.generateToken(parent.getId(), "parent");
            
            ParentLoginResponse response = ParentLoginResponse.builder()
                    .userId(parent.getId())
                    .nickname(parent.getNickname())
                    .phone(parent.getPhone())
                    .token(token)
                    .build();
            
            return ResponseEntity.ok(ApiResponse.created("家长注册成功", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(ApiResponse.badRequest(e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<ParentLoginResponse>> login(@Valid @RequestBody ParentLoginRequest request) {
        return parentService.login(request.getPhone(), request.getPassword())
                .map(parent -> {
                    String token = jwtUtil.generateToken(parent.getId(), "parent");
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

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<ParentLoginResponse>> getCurrentUser() {
        String userId = getCurrentUserId();
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

    @PostMapping("/children/bind")
    public ResponseEntity<ApiResponse<ChildBindingResponse>> bindChild(@Valid @RequestBody BindStudentRequest request) {
        String parentId = getCurrentUserId();
        try {
            ParentStudentBinding binding = parentService.bindStudent(
                    parentId, 
                    request.getStudentId(), 
                    request.getStudentNickname(), 
                    request.getBindType()
            );
            return ResponseEntity.ok(ApiResponse.created("绑定成功", toChildBindingResponse(binding)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(ApiResponse.badRequest(e.getMessage()));
        }
    }

    @PostMapping("/children/{bindingId}/authorize")
    public ResponseEntity<ApiResponse<ChildBindingResponse>> authorizeBinding(@PathVariable String bindingId) {
        String parentId = getCurrentUserId();
        
        return parentService.getBinding(bindingId)
                .filter(binding -> binding.getParentId().equals(parentId))
                .map(binding -> {
                    ParentStudentBinding updated = parentService.authorizeBinding(bindingId);
                    return ResponseEntity.ok(ApiResponse.success("授权成功", toChildBindingResponse(updated)));
                })
                .orElse(ResponseEntity.ok(ApiResponse.forbidden("无权操作该绑定记录")));
    }

    @DeleteMapping("/children/{bindingId}")
    public ResponseEntity<ApiResponse<Void>> unbindChild(@PathVariable String bindingId) {
        String parentId = getCurrentUserId();
        
        return parentService.getBinding(bindingId)
                .filter(binding -> binding.getParentId().equals(parentId))
                .map(binding -> {
                    parentService.unbindStudent(bindingId);
                    return ResponseEntity.ok(ApiResponse.success("解除绑定成功", null));
                })
                .orElse(ResponseEntity.ok(ApiResponse.forbidden("无权操作该绑定记录")));
    }

    @GetMapping("/children")
    public ResponseEntity<ApiResponse<List<ChildBindingResponse>>> getChildren() {
        String parentId = getCurrentUserId();
        List<ChildBindingResponse> children = parentService.getChildren(parentId)
                .stream()
                .map(this::toChildBindingResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(children));
    }

    @GetMapping("/children/{bindingId}")
    public ResponseEntity<ApiResponse<ChildBindingResponse>> getChild(@PathVariable String bindingId) {
        String parentId = getCurrentUserId();
        return parentService.getBinding(bindingId)
                .filter(binding -> binding.getParentId().equals(parentId))
                .map(binding -> ResponseEntity.ok(ApiResponse.success(toChildBindingResponse(binding))))
                .orElse(ResponseEntity.ok(ApiResponse.forbidden("无权查看该孩子信息")));
    }

    @GetMapping("/emergency/alert")
    public ResponseEntity<ApiResponse<EmergencyAlertResponse>> getActiveAlert() {
        String parentId = getCurrentUserId();
        return parentService.getActiveAlert(parentId)
                .map(alert -> ResponseEntity.ok(ApiResponse.success(toEmergencyAlertResponse(alert))))
                .orElse(ResponseEntity.ok(ApiResponse.success("暂无预警", null)));
    }

    @PostMapping("/emergency/alert/{alertId}/confirm")
    public ResponseEntity<ApiResponse<EmergencyAlertResponse>> confirmAlert(@PathVariable String alertId) {
        String parentId = getCurrentUserId();
        
        return parentService.getActiveAlert(parentId)
                .filter(alert -> alert.getId().equals(alertId))
                .map(alert -> {
                    EmergencyAlert confirmed = parentService.confirmAlert(alertId);
                    return ResponseEntity.ok(ApiResponse.success("确认成功", toEmergencyAlertResponse(confirmed)));
                })
                .orElse(ResponseEntity.ok(ApiResponse.forbidden("无权确认该预警")));
    }

    @GetMapping("/emergency/resources")
    public ResponseEntity<ApiResponse<List<EmergencyResourceResponse>>> getEmergencyResources() {
        List<EmergencyResourceResponse> resources = parentService.getEmergencyResources()
                .stream()
                .map(this::toEmergencyResourceResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(resources));
    }

    @GetMapping("/emergency/resources/{type}")
    public ResponseEntity<ApiResponse<List<EmergencyResourceResponse>>> getResourcesByType(@PathVariable String type) {
        List<EmergencyResourceResponse> resources = parentService.getResourcesByType(type)
                .stream()
                .map(this::toEmergencyResourceResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(resources));
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getPrincipal().toString() : null;
    }

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
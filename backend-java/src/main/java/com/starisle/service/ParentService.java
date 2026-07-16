package com.starisle.service;

import com.starisle.entity.EmergencyAlert;
import com.starisle.entity.EmergencyResource;
import com.starisle.entity.ParentStudentBinding;
import com.starisle.entity.ParentUser;
import com.starisle.repository.EmergencyAlertRepository;
import com.starisle.repository.EmergencyResourceRepository;
import com.starisle.repository.ParentStudentBindingRepository;
import com.starisle.repository.ParentUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ParentService {

    private final ParentUserRepository parentUserRepository;
    private final ParentStudentBindingRepository bindingRepository;
    private final EmergencyAlertRepository alertRepository;
    private final EmergencyResourceRepository resourceRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public ParentUser register(String phone, String password, String nickname) {
        if (parentUserRepository.existsByPhone(phone)) {
            throw new IllegalArgumentException("手机号已被注册");
        }
        
        ParentUser parent = ParentUser.builder()
                .phone(phone)
                .passwordHash(passwordEncoder.encode(password))
                .nickname(nickname)
                .isActive(true)
                .build();
        
        return parentUserRepository.save(parent);
    }

    public Optional<ParentUser> login(String phone, String password) {
        return parentUserRepository.findByPhone(phone)
                .filter(user -> passwordEncoder.matches(password, user.getPasswordHash()))
                .map(user -> {
                    user.setLastLoginAt(LocalDateTime.now());
                    return parentUserRepository.save(user);
                });
    }

    public Optional<ParentUser> findById(String id) {
        return parentUserRepository.findById(id);
    }

    public Optional<ParentUser> findByPhone(String phone) {
        return parentUserRepository.findByPhone(phone);
    }

    @Transactional
    public ParentStudentBinding bindStudent(String parentId, String studentId, String studentNickname, String bindType) {
        if (bindingRepository.existsByParentIdAndStudentId(parentId, studentId)) {
            throw new IllegalArgumentException("该孩子已绑定");
        }
        
        return bindingRepository.save(ParentStudentBinding.builder()
                .parentId(parentId)
                .studentId(studentId)
                .studentNickname(studentNickname)
                .bindType(bindType)
                .authorized(false)
                .latestMood(3)
                .riskLevel("green")
                .build());
    }

    @Transactional
    public ParentStudentBinding authorizeBinding(String bindingId) {
        return bindingRepository.findById(bindingId)
                .map(binding -> {
                    binding.setAuthorized(true);
                    binding.setAuthorizedAt(LocalDateTime.now());
                    return bindingRepository.save(binding);
                })
                .orElseThrow(() -> new IllegalArgumentException("绑定记录不存在"));
    }

    @Transactional
    public void unbindStudent(String bindingId) {
        if (!bindingRepository.existsById(bindingId)) {
            throw new IllegalArgumentException("绑定记录不存在");
        }
        bindingRepository.deleteById(bindingId);
    }

    public List<ParentStudentBinding> getChildren(String parentId) {
        return bindingRepository.findByParentId(parentId);
    }

    public Optional<ParentStudentBinding> getBinding(String bindingId) {
        return bindingRepository.findById(bindingId);
    }

    @Transactional
    public void updateMoodStatus(String studentId, Integer moodLevel, String riskLevel, String checkinDate) {
        bindingRepository.findByStudentId(studentId)
                .ifPresent(binding -> {
                    binding.setLatestMood(moodLevel);
                    binding.setRiskLevel(riskLevel);
                    binding.setLastCheckinDate(checkinDate);
                    bindingRepository.save(binding);
                });
    }

    @Transactional
    public EmergencyAlert createAlert(String studentId, String parentId, String riskLevel, String triggerSource, String description) {
        return alertRepository.save(EmergencyAlert.builder()
                .studentId(studentId)
                .parentId(parentId)
                .riskLevel(riskLevel)
                .triggerSource(triggerSource)
                .description(description)
                .status("pending")
                .build());
    }

    @Transactional
    public EmergencyAlert confirmAlert(String alertId) {
        return alertRepository.findById(alertId)
                .map(alert -> {
                    alert.setStatus("confirmed");
                    alert.setConfirmedAt(LocalDateTime.now());
                    return alertRepository.save(alert);
                })
                .orElseThrow(() -> new IllegalArgumentException("预警记录不存在"));
    }

    public Optional<EmergencyAlert> getActiveAlert(String parentId) {
        return alertRepository.findByParentIdAndStatus(parentId, "pending");
    }

    public List<EmergencyAlert> getAlertHistory(String parentId) {
        return alertRepository.findByParentIdOrderByTriggeredAtDesc(parentId);
    }

    public List<EmergencyResource> getEmergencyResources() {
        return resourceRepository.findByIsActiveTrueOrderBySortOrder();
    }

    public List<EmergencyResource> getResourcesByType(String type) {
        return resourceRepository.findByTypeAndIsActiveTrueOrderBySortOrder(type);
    }
}
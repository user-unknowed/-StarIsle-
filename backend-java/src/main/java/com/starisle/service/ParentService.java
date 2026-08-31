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

/**
 * 家长服务
 * 处理家长用户注册登录、学生绑定管理、情绪状态同步与紧急预警功能。
 */
@Service
@RequiredArgsConstructor
public class ParentService {

    /** 家长用户仓库，提供家长账号持久化能力 */
    private final ParentUserRepository parentUserRepository;
    /** 亲子绑定仓库，提供家长-学生绑定关系持久化能力 */
    private final ParentStudentBindingRepository bindingRepository;
    /** 紧急预警仓库，提供预警记录持久化能力 */
    private final EmergencyAlertRepository alertRepository;
    /** 紧急资源仓库，提供应急资源查询能力 */
    private final EmergencyResourceRepository resourceRepository;
    /** 密码编码器，用于密码哈希与校验 */
    private final PasswordEncoder passwordEncoder;

    /**
     * 家长注册
     * 验证手机号唯一性后创建家长用户。
     *
     * @param phone    手机号
     * @param password 密码
     * @param nickname 昵称
     * @return 创建的家长用户
     * @throws IllegalArgumentException 当手机号已注册时抛出
     */
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

    /**
     * 家长登录
     * 校验手机号与密码匹配后更新最后登录时间。
     *
     * @param phone    手机号
     * @param password 密码
     * @return 登录成功的家长用户，失败返回空
     */
    public Optional<ParentUser> login(String phone, String password) {
        return parentUserRepository.findByPhone(phone)
                .filter(user -> passwordEncoder.matches(password, user.getPasswordHash()))
                .map(user -> {
                    user.setLastLoginAt(LocalDateTime.now());
                    return parentUserRepository.save(user);
                });
    }

    /**
     * 根据标识查询家长
     *
     * @param id 家长标识
     * @return 家长用户，不存在返回空
     */
    public Optional<ParentUser> findById(String id) {
        return parentUserRepository.findById(id);
    }

    /**
     * 根据手机号查询家长
     *
     * @param phone 手机号
     * @return 家长用户，不存在返回空
     */
    public Optional<ParentUser> findByPhone(String phone) {
        return parentUserRepository.findByPhone(phone);
    }

    /**
     * 绑定学生
     * 校验家长与学生的绑定关系不存在后创建绑定记录，初始未授权、心情默认 3、风险等级绿色。
     *
     * @param parentId         家长标识
     * @param studentId        学生标识
     * @param studentNickname  学生昵称
     * @param bindType         绑定方式
     * @return 创建的绑定记录
     * @throws IllegalArgumentException 当该孩子已绑定时抛出
     */
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

    /**
     * 授权绑定
     * 将指定绑定记录置为已授权并记录授权时间。
     *
     * @param bindingId 绑定记录标识
     * @return 更新后的绑定记录
     * @throws IllegalArgumentException 当绑定记录不存在时抛出
     */
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

    /**
     * 解绑学生
     * 删除指定绑定记录。
     *
     * @param bindingId 绑定记录标识
     * @throws IllegalArgumentException 当绑定记录不存在时抛出
     */
    @Transactional
    public void unbindStudent(String bindingId) {
        if (!bindingRepository.existsById(bindingId)) {
            throw new IllegalArgumentException("绑定记录不存在");
        }
        bindingRepository.deleteById(bindingId);
    }

    /**
     * 查询家长绑定的所有孩子
     *
     * @param parentId 家长标识
     * @return 绑定记录列表
     */
    public List<ParentStudentBinding> getChildren(String parentId) {
        return bindingRepository.findByParentId(parentId);
    }

    /**
     * 查询绑定记录
     *
     * @param bindingId 绑定记录标识
     * @return 绑定记录，不存在返回空
     */
    public Optional<ParentStudentBinding> getBinding(String bindingId) {
        return bindingRepository.findById(bindingId);
    }

    /**
     * 更新心情状态
     * 根据学生标识更新绑定的最新心情、风险等级与打卡日期。
     *
     * @param studentId   学生标识
     * @param moodLevel   心情等级
     * @param riskLevel   风险等级
     * @param checkinDate 打卡日期
     */
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

    /**
     * 创建紧急预警
     * 根据学生与家长标识、风险等级、触发来源与描述创建预警记录，初始状态为待处理。
     *
     * @param studentId    学生标识
     * @param parentId     家长标识
     * @param riskLevel    风险等级
     * @param triggerSource 触发来源
     * @param description  预警描述
     * @return 创建的预警记录
     */
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

    /**
     * 确认预警
     * 将预警状态置为已确认并记录确认时间。
     *
     * @param alertId 预警标识
     * @return 更新后的预警记录
     * @throws IllegalArgumentException 当预警记录不存在时抛出
     */
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

    /**
     * 查询家长的待处理预警
     *
     * @param parentId 家长标识
     * @return 待处理预警记录，不存在返回空
     */
    public Optional<EmergencyAlert> getActiveAlert(String parentId) {
        return alertRepository.findByParentIdAndStatus(parentId, "pending");
    }

    /**
     * 查询家长预警历史
     * 按触发时间倒序返回预警记录。
     *
     * @param parentId 家长标识
     * @return 预警记录列表
     */
    public List<EmergencyAlert> getAlertHistory(String parentId) {
        return alertRepository.findByParentIdOrderByTriggeredAtDesc(parentId);
    }

    /**
     * 查询所有启用的紧急资源
     * 按排序字段升序返回。
     *
     * @return 紧急资源列表
     */
    public List<EmergencyResource> getEmergencyResources() {
        return resourceRepository.findByIsActiveTrueOrderBySortOrder();
    }

    /**
     * 按类型查询启用的紧急资源
     *
     * @param type 资源类型
     * @return 紧急资源列表
     */
    public List<EmergencyResource> getResourcesByType(String type) {
        return resourceRepository.findByTypeAndIsActiveTrueOrderBySortOrder(type);
    }
}
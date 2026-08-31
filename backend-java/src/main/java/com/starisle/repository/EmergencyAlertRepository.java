package com.starisle.repository;

import com.starisle.entity.EmergencyAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 紧急预警数据访问层
 * 提供按家长 ID、学生 ID 与预警状态查询预警记录等能力。
 */
@Repository
public interface EmergencyAlertRepository extends JpaRepository<EmergencyAlert, String> {

    /**
     * 按家长 ID 查询预警（按触发时间倒序）
     *
     * @param parentId 家长 ID
     * @return 预警列表
     */
    List<EmergencyAlert> findByParentIdOrderByTriggeredAtDesc(String parentId);

    /**
     * 按家长 ID 与状态查询预警
     *
     * @param parentId 家长 ID
     * @param status   预警状态
     * @return 预警可选值
     */
    Optional<EmergencyAlert> findByParentIdAndStatus(String parentId, String status);

    /**
     * 按学生 ID 与状态查询预警
     *
     * @param studentId 学生 ID
     * @param status    预警状态
     * @return 预警可选值
     */
    Optional<EmergencyAlert> findByStudentIdAndStatus(String studentId, String status);
}

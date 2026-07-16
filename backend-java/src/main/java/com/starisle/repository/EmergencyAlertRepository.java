package com.starisle.repository;

import com.starisle.entity.EmergencyAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmergencyAlertRepository extends JpaRepository<EmergencyAlert, String> {
    List<EmergencyAlert> findByParentIdOrderByTriggeredAtDesc(String parentId);
    Optional<EmergencyAlert> findByParentIdAndStatus(String parentId, String status);
    Optional<EmergencyAlert> findByStudentIdAndStatus(String studentId, String status);
}
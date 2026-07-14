package com.starisle.repository;

import com.starisle.entity.AssessmentResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssessmentResultRepository extends JpaRepository<AssessmentResult, String> {

    List<AssessmentResult> findByUserIdOrderByCreatedAtDesc(String userId);

    List<AssessmentResult> findByUserIdAndTypeOrderByCreatedAtDesc(String userId, String type);
}

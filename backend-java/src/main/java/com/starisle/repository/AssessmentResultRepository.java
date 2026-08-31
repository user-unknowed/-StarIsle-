package com.starisle.repository;

import com.starisle.entity.AssessmentResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 测评结果数据访问层
 * 提供基于用户 ID 与测评类型的查询能力。
 */
@Repository
public interface AssessmentResultRepository extends JpaRepository<AssessmentResult, String> {

    /**
     * 按用户 ID 查询测评结果（按创建时间倒序）
     *
     * @param userId 用户 ID
     * @return 测评结果列表
     */
    List<AssessmentResult> findByUserIdOrderByCreatedAtDesc(String userId);

    /**
     * 按用户 ID 与测评类型查询结果（按创建时间倒序）
     *
     * @param userId 用户 ID
     * @param type    测评类型
     * @return 测评结果列表
     */
    List<AssessmentResult> findByUserIdAndTypeOrderByCreatedAtDesc(String userId, String type);
}

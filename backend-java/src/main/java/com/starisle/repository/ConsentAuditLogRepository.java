package com.starisle.repository;

import com.starisle.entity.ConsentAuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 同意审计日志数据访问层
 * 仅提供追加与按用户倒序查询能力。
 */
@Repository
public interface ConsentAuditLogRepository extends JpaRepository<ConsentAuditLog, String> {

    /**
     * 查询指定用户的审计日志（按时间倒序）
     *
     * @param userId   用户 ID
     * @param pageable 分页参数
     * @return 审计日志列表
     */
    List<ConsentAuditLog> findByUserIdOrderByOccurredAtDesc(String userId, Pageable pageable);
}

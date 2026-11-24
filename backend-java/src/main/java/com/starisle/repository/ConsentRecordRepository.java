package com.starisle.repository;

import com.starisle.entity.ConsentRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 同意记录数据访问层
 * 提供按用户与范围查询当前授权状态的能力。
 */
@Repository
public interface ConsentRecordRepository extends JpaRepository<ConsentRecord, String> {

    /**
     * 查询指定用户在某个范围下的同意记录
     *
     * @param userId 用户 ID
     * @param scope  同意范围
     * @return 同意记录
     */
    Optional<ConsentRecord> findByUserIdAndScope(String userId, String scope);

    /**
     * 查询指定用户的全部同意记录
     *
     * @param userId 用户 ID
     * @return 同意记录列表
     */
    List<ConsentRecord> findByUserIdOrderByUpdatedAtDesc(String userId);
}

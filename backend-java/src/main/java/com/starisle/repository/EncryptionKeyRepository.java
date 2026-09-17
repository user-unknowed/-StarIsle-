package com.starisle.repository;

import com.starisle.entity.EncryptionKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 加密密钥数据访问层
 * 提供按密钥 ID、版本、类型查询与失效密钥检索等能力。
 */
@Repository
public interface EncryptionKeyRepository extends JpaRepository<EncryptionKey, Integer> {

    /**
     * 按密钥 ID 查询密钥
     *
     * @param keyId 密钥 ID
     * @return 密钥可选值
     */
    Optional<EncryptionKey> findByKeyId(String keyId);

    /**
     * 按密钥版本与类型查询启用的密钥
     *
     * @param keyVersion 密钥版本
     * @param keyType    密钥类型
     * @return 密钥可选值
     */
    Optional<EncryptionKey> findByKeyVersionAndKeyTypeAndIsActiveTrue(String keyVersion, String keyType);

    /**
     * 按密钥类型查询最新启用的密钥
     *
     * @param keyType 密钥类型
     * @return 密钥可选值
     */
    Optional<EncryptionKey> findTopByKeyTypeAndIsActiveTrueOrderByCreatedAtDesc(String keyType);

    /**
     * 按密钥类型查询所有启用的密钥
     *
     * @param keyType 密钥类型
     * @return 密钥列表
     */
    List<EncryptionKey> findByKeyTypeAndIsActiveTrue(String keyType);

    /**
     * 查询指定时间前已失效但仍标记为启用的密钥
     *
     * @param dateTime 比较时间点
     * @return 密钥列表
     */
    List<EncryptionKey> findByExpiresAtBeforeAndIsActiveTrue(LocalDateTime dateTime);

    /**
     * 判断指定密钥版本是否存在
     *
     * @param keyVersion 密钥版本
     * @return 是否存在
     */
    boolean existsByKeyVersion(String keyVersion);

    /**
     * 按密钥版本删除
     *
     * @param keyVersion 密钥版本
     */
    void deleteByKeyVersion(String keyVersion);
}

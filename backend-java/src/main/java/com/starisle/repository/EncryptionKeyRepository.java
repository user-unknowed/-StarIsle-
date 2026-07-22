package com.starisle.repository;

import com.starisle.entity.EncryptionKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EncryptionKeyRepository extends JpaRepository<EncryptionKey, Integer> {

    Optional<EncryptionKey> findByKeyId(String keyId);

    Optional<EncryptionKey> findByKeyVersionAndKeyTypeAndIsActiveTrue(String keyVersion, String keyType);

    Optional<EncryptionKey> findTopByKeyTypeAndIsActiveTrueOrderByCreatedAtDesc(String keyType);

    List<EncryptionKey> findByKeyTypeAndIsActiveTrue(String keyType);

    List<EncryptionKey> findByExpiresAtBeforeAndIsActiveTrue(LocalDateTime dateTime);

    boolean existsByKeyVersion(String keyVersion);

    void deleteByKeyVersion(String keyVersion);
}

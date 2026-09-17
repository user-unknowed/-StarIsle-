package com.starisle.repository;

import com.starisle.entity.ParentUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 家长用户数据访问层
 * 提供按手机号查询家长用户等能力。
 */
@Repository
public interface ParentUserRepository extends JpaRepository<ParentUser, String> {

    /**
     * 按手机号查询家长用户
     *
     * @param phone 手机号
     * @return 家长用户可选值
     */
    Optional<ParentUser> findByPhone(String phone);

    /**
     * 判断手机号是否已被注册
     *
     * @param phone 手机号
     * @return 是否已注册
     */
    boolean existsByPhone(String phone);
}

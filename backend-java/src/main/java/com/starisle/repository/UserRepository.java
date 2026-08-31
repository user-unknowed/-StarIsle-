package com.starisle.repository;

import com.starisle.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

/**
 * 用户数据访问层
 * 提供按用户名、角色、班级查询用户的能力。
 */
@Repository
public interface UserRepository extends JpaRepository<User, String> {

    /**
     * 按用户名查询用户
     *
     * @param username 用户名
     * @return 用户可选值
     */
    Optional<User> findByUsername(String username);

    /**
     * 判断用户名是否已存在
     *
     * @param username 用户名
     * @return 是否存在
     */
    boolean existsByUsername(String username);

    /**
     * 按角色查询用户
     *
     * @param role 角色
     * @return 用户列表
     */
    List<User> findByRole(String role);

    /**
     * 按班级 ID 查询用户
     *
     * @param classId 班级 ID
     * @return 用户列表
     */
    List<User> findByClassId(String classId);
}

package com.starisle.repository;

import com.starisle.entity.ParentStudentBinding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 家长-学生绑定关系数据访问层
 * 提供按家长 ID、学生 ID 查询绑定关系等能力。
 */
@Repository
public interface ParentStudentBindingRepository extends JpaRepository<ParentStudentBinding, String> {

    /**
     * 按家长 ID 查询所有绑定
     *
     * @param parentId 家长 ID
     * @return 绑定列表
     */
    List<ParentStudentBinding> findByParentId(String parentId);

    /**
     * 按家长 ID 与学生 ID 查询绑定
     *
     * @param parentId  家长 ID
     * @param studentId 学生 ID
     * @return 绑定可选值
     */
    Optional<ParentStudentBinding> findByParentIdAndStudentId(String parentId, String studentId);

    /**
     * 按学生 ID 查询绑定
     *
     * @param studentId 学生 ID
     * @return 绑定可选值
     */
    Optional<ParentStudentBinding> findByStudentId(String studentId);

    /**
     * 判断家长与学生是否已绑定
     *
     * @param parentId  家长 ID
     * @param studentId 学生 ID
     * @return 是否已绑定
     */
    boolean existsByParentIdAndStudentId(String parentId, String studentId);
}

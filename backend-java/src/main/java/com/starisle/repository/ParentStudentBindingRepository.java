package com.starisle.repository;

import com.starisle.entity.ParentStudentBinding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParentStudentBindingRepository extends JpaRepository<ParentStudentBinding, String> {
    List<ParentStudentBinding> findByParentId(String parentId);
    Optional<ParentStudentBinding> findByParentIdAndStudentId(String parentId, String studentId);
    Optional<ParentStudentBinding> findByStudentId(String studentId);
    boolean existsByParentIdAndStudentId(String parentId, String studentId);
}
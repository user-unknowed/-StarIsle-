package com.starisle.repository;

import com.starisle.entity.EmergencyResource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 紧急资源数据访问层
 * 提供按类型与启用状态查询紧急资源的能力。
 */
@Repository
public interface EmergencyResourceRepository extends JpaRepository<EmergencyResource, String> {

    /**
     * 按类型查询启用的紧急资源（按排序权重）
     *
     * @param type 资源类型
     * @return 资源列表
     */
    List<EmergencyResource> findByTypeAndIsActiveTrueOrderBySortOrder(String type);

    /**
     * 查询所有启用的紧急资源（按排序权重）
     *
     * @return 资源列表
     */
    List<EmergencyResource> findByIsActiveTrueOrderBySortOrder();
}

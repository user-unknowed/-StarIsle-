package com.starisle.repository;

import com.starisle.entity.EmergencyResource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmergencyResourceRepository extends JpaRepository<EmergencyResource, String> {
    List<EmergencyResource> findByTypeAndIsActiveTrueOrderBySortOrder(String type);
    List<EmergencyResource> findByIsActiveTrueOrderBySortOrder();
}
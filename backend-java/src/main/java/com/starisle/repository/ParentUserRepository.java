package com.starisle.repository;

import com.starisle.entity.ParentUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ParentUserRepository extends JpaRepository<ParentUser, String> {
    Optional<ParentUser> findByPhone(String phone);
    boolean existsByPhone(String phone);
}
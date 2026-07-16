package com.starisle.repository;

import com.starisle.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {
    List<ChatMessage> findByUserIdOrderByCreatedAtDesc(String userId);
    List<ChatMessage> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    default List<ChatMessage> findByUserIdOrderByCreatedAtDesc(String userId, Integer limit) {
        return findByUserIdOrderByCreatedAtDesc(userId, Pageable.ofSize(limit));
    }
}
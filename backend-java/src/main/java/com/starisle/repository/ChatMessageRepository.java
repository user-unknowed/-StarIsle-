package com.starisle.repository;

import com.starisle.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {

    List<ChatMessage> findByUserIdOrderByCreatedAtDesc(String userId);

    List<ChatMessage> findTop50ByUserIdOrderByCreatedAtDesc(String userId);
}

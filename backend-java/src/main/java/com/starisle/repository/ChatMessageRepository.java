package com.starisle.repository;

import com.starisle.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 聊天消息数据访问层
 * 提供按用户 ID 查询聊天记录（支持分页）的能力。
 */
@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {

    /**
     * 按用户 ID 查询所有消息（按创建时间倒序）
     *
     * @param userId 用户 ID
     * @return 消息列表
     */
    List<ChatMessage> findByUserIdOrderByCreatedAtDesc(String userId);

    /**
     * 按用户 ID 分页查询消息（按创建时间倒序）
     *
     * @param userId   用户 ID
     * @param pageable 分页参数
     * @return 消息列表
     */
    List<ChatMessage> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    /**
     * 按用户 ID 查询指定条数消息
     *
     * @param userId 用户 ID
     * @param limit  最大返回条数
     * @return 消息列表
     */
    default List<ChatMessage> findByUserIdOrderByCreatedAtDesc(String userId, Integer limit) {
        // 通过 Pageable 限定返回条数
        return findByUserIdOrderByCreatedAtDesc(userId, Pageable.ofSize(limit));
    }
}

package com.starisle.repository;

import com.starisle.entity.MoodRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 心情记录数据访问层
 * 提供按用户 ID、日期范围查询心情记录与统计连续打卡天数等能力。
 */
@Repository
public interface MoodRecordRepository extends JpaRepository<MoodRecord, String> {

    /**
     * 按用户 ID 查询心情记录（按打卡日期倒序）
     *
     * @param userId 用户 ID
     * @return 心情记录列表
     */
    List<MoodRecord> findByUserIdOrderByCheckinDateDesc(String userId);

    /**
     * 按用户 ID 与日期范围查询心情记录
     *
     * @param userId    用户 ID
     * @param startDate 起始日期
     * @param endDate   截止日期
     * @return 心情记录列表
     */
    List<MoodRecord> findByUserIdAndCheckinDateBetween(String userId, LocalDate startDate, LocalDate endDate);

    /**
     * 统计用户在指定起始日期之后的连续打卡天数
     *
     * @param userId    用户 ID
     * @param startDate 起始日期
     * @return 连续打卡天数
     */
    @Query(value = """
        SELECT COUNT(DISTINCT mr.checkin_date) FROM mood_records mr
        WHERE mr.user_id = :userId
        AND mr.checkin_date >= :startDate
        """, nativeQuery = true)
    long countContinuousCheckinDays(@Param("userId") String userId, @Param("startDate") LocalDate startDate);

    /**
     * 统计用户最近一年内的连续打卡天数（便捷重载）
     *
     * @param userId 用户 ID
     * @return 连续打卡天数
     */
    default long countContinuousCheckinDays(String userId) {
        // 默认查询最近一年内的打卡天数
        return countContinuousCheckinDays(userId, LocalDate.now().minusDays(365));
    }
}

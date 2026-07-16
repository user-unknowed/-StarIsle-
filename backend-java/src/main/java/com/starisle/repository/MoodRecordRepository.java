package com.starisle.repository;

import com.starisle.entity.MoodRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MoodRecordRepository extends JpaRepository<MoodRecord, String> {
    List<MoodRecord> findByUserIdOrderByCheckinDateDesc(String userId);
    List<MoodRecord> findByUserIdAndCheckinDateBetween(String userId, LocalDate startDate, LocalDate endDate);

    @Query(value = """
        SELECT COUNT(DISTINCT mr.checkin_date) FROM mood_records mr 
        WHERE mr.user_id = :userId 
        AND mr.checkin_date >= :startDate
        """, nativeQuery = true)
    long countContinuousCheckinDays(@Param("userId") String userId, @Param("startDate") LocalDate startDate);

    default long countContinuousCheckinDays(String userId) {
        return countContinuousCheckinDays(userId, LocalDate.now().minusDays(365));
    }
}
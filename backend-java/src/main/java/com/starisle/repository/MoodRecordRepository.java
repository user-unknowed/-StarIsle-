package com.starisle.repository;

import com.starisle.entity.MoodRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MoodRecordRepository extends JpaRepository<MoodRecord, String> {

    List<MoodRecord> findByUserIdOrderByCheckinDateDesc(String userId);

    List<MoodRecord> findByUserIdAndCheckinDateBetweenOrderByCheckinDateDesc(
            String userId, LocalDate startDate, LocalDate endDate);

    Optional<MoodRecord> findByUserIdAndCheckinDate(String userId, LocalDate checkinDate);

    long countByUserIdAndCheckinDateBetween(String userId, LocalDate startDate, LocalDate endDate);
}

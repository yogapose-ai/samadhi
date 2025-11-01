package com.capstone.samadhi.record.repository;

import com.capstone.samadhi.record.entity.Record;
import com.capstone.samadhi.security.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RecordRepository extends JpaRepository<Record, Long> {

    Page<Record> findByUser(User user, Pageable pageable);
}

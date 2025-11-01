package com.capstone.samadhi.record.repository;

import com.capstone.samadhi.record.entity.Record;
import com.capstone.samadhi.security.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecordRepository extends JpaRepository<Record, Long> {

    List<Record> findByUser(User user);
}

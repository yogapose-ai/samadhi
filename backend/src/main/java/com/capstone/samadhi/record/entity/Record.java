package com.capstone.samadhi.record.entity;

import com.capstone.samadhi.common.TimeStamp;
import com.capstone.samadhi.security.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name="record")
public class Record extends TimeStamp {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="recordId")
    private Long id;

    private Duration workingout_time;
    private String youtube_url;
    private int total_score;

    @ManyToOne
    @JoinColumn(name="userId")
    private User user;

    @OneToMany(mappedBy = "record", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TimeLine> timeLineList = new ArrayList<>();

    public void addUser(User user) {
        user.getRecordList().add(this);
        this.user=user;
    }
}

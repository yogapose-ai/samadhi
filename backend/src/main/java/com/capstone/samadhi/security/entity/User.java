package com.capstone.samadhi.security.entity;

import com.capstone.samadhi.record.entity.Record;
import com.capstone.samadhi.record.entity.TimeLine;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class User {
    @Id
    private String id;
    private String password;
    private String profile;
    private String nickname;
    private String gender;
    private LocalDate birth;
    private float height;
    private float weight;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Record> recordList = new ArrayList<>();
}

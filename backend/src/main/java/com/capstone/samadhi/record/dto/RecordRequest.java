package com.capstone.samadhi.record.dto;

import com.capstone.samadhi.record.entity.Record;
import com.capstone.samadhi.security.entity.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.Duration;
import java.util.List;

public record RecordRequest(
        @NotNull(message = "운동 시간은 필수입니다.")
        int workingout_time,

        @NotBlank(message = "유튜브 URL은 필수입니다.")
        String youtube_url,

        @NotNull(message = "총점은 필수입니다.")
        @PositiveOrZero(message = "점수는 0 이상이어야 합니다.")
        int total_score,

        @Valid // 리스트 내부의 DTO(TimeLineRequest)까지 유효성 검사를 진행
        @NotEmpty(message = "타임라인 정보는 최소 1개 이상 포함되어야 합니다.")
        List<TimeLineRequest> timeLineList
) {

    public Record toEntity(User user) {

        Record record = Record.builder()
                .workingout_time(Duration.ofSeconds(workingout_time))
                .youtube_url(this.youtube_url)
                .total_score(this.total_score)
                .build();
        record.addUser(user);
        if (this.timeLineList != null) {
            this.timeLineList.stream()
                    .map(TimeLineRequest::toEntity) // TimeLine 엔티티로 변환
                    .forEach(timeLine -> timeLine.addRecord(record)); // '연관관계 편의 메소드' 사용
        }

        return record;
    }
}
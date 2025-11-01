package com.capstone.samadhi.record.dto;

import com.capstone.samadhi.record.entity.TimeLine;
import io.swagger.v3.oas.annotations.media.Schema; // <-- import 추가

public record TimeLineResponse(
        @Schema(description = "유튜브 영상 시작 초", example = "0")
        int youtube_start_sec,

        @Schema(description = "유튜브 영상 종료 초", example = "60")
        int youtube_end_sec,

        @Schema(description = "자세 이름", example = "Downward Dog")
        String pose,

        @Schema(description = "해당 구간 점수", example = "95")
        float score,

        @Schema(description = "image url", example = "image url")
        String image
) {

    public static TimeLineResponse from(TimeLine timeLine) {
        return new TimeLineResponse(
                timeLine.getYoutube_start_sec(),
                timeLine.getYoutube_end_sec(),
                timeLine.getPose(),
                timeLine.getScore(),
                timeLine.getImage()
        );
    }
}
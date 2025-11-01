package com.capstone.samadhi.security.dto;

import com.capstone.samadhi.security.entity.User;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

@Data
@Getter
@Setter
public class UserInfoDto {
    @Schema(description = "아이디")
    private String id;
    @Schema(description = "닉네임")
    private String nickname;
    @Schema(description = "성별", example = "f", allowableValues = {"f", "m"})
    private SignUpDto.Gender gender;
    @Schema(description = "생년월일", example = "2000-01-01")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate birth;
    @Schema(description = "몸무게")
    private float weight;
    @Schema(description = "키")
    private float height;
    @Schema(description = "프로필 사진 데이터")
    private String profile;

    public enum Gender {
        f, m
    }

    public UserInfoDto(User user) {
        this.id = user.getId();
        this.nickname = user.getNickname();
        if(user.getGender().equalsIgnoreCase("f")) this.gender = SignUpDto.Gender.f;
        else this.gender = SignUpDto.Gender.m;
        this.birth = user.getBirth();
        this.weight = user.getWeight();
        this.height = user.getHeight();
        this.profile = user.getProfile();
    }
}

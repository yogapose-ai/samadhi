package com.capstone.samadhi.security.service;


import com.capstone.samadhi.common.ResponseDto;
import com.capstone.samadhi.common.service.S3Service;
import com.capstone.samadhi.security.dto.SignUpDto;
import com.capstone.samadhi.security.entity.User;
import com.capstone.samadhi.security.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final S3Service s3Service;
    private final PasswordEncoder passwordEncoder;

    public ResponseEntity<?> register(SignUpDto dto) {
        if(userRepository.existsById(dto.getId())) {
            return new ResponseEntity<>(new ResponseDto<String>(false, "이미 존재하는 아이디입니다"), HttpStatus.BAD_REQUEST);
        }
        String url;
        //프로필 등록
        try {
            url = s3Service.uploadFile(dto.getProfile());
        } catch (Exception e) {
            return new ResponseEntity<>(new ResponseDto<String>(false, "파일 업로드 중 에러"), HttpStatus.INTERNAL_SERVER_ERROR);
        }

        userRepository.save(new User(
                dto.getId(),
                passwordEncoder.encode(dto.getPwd()),
                url,
                dto.getNickname(),
                dto.getGender().name(),
                dto.getBirth(),
                dto.getHeight(),
                dto.getWeight(),
                new ArrayList<>()
        ));

        return new ResponseEntity<>(new ResponseDto<String>(true, "성공"), HttpStatus.OK);
    }
}

package com.capstone.samadhi.security.service;


import com.capstone.samadhi.common.ResponseDto;
import com.capstone.samadhi.common.SecurityUtil;
import com.capstone.samadhi.common.service.S3Service;
import com.capstone.samadhi.exception.InternalServerException;
import com.capstone.samadhi.exception.LoginTokenException;
import com.capstone.samadhi.security.dto.SignUpDto;
import com.capstone.samadhi.security.dto.UpdateDto;
import com.capstone.samadhi.security.dto.UserInfoDto;
import com.capstone.samadhi.security.entity.User;
import com.capstone.samadhi.security.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
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
                dto.getWeight()
        ));

        return new ResponseEntity<>(new ResponseDto<String>(true, "성공"), HttpStatus.OK);
    }

    /**
     * 회원 정보 수정
     * @param dto 수정할 데이터
     * @return 수정 결과
     */
    @Transactional
    public ResponseEntity<?> updateInfo(UpdateDto dto) {
        String userId = SecurityUtil.getCurrentUser();
        if(userId == null) {
            throw new LoginTokenException("유효한 토큰이 존재하지 않습니다");
        }
        User user = userRepository.findById(userId).orElse(null);
        if(user == null) {
            throw new LoginTokenException("존재하지 않는 사용자입니다");
        }

        if(dto.getPwd() != null) user.setPassword(passwordEncoder.encode(dto.getPwd()));
        if(dto.getNickname() != null) user.setNickname(dto.getNickname());
        if(dto.getGender() != null) user.setGender(dto.getGender().name());
        if(dto.getBirth() != null) user.setBirth(dto.getBirth());
        if(dto.getWeight() != 0) user.setWeight(dto.getWeight());
        if(dto.getHeight() != 0) user.setHeight(dto.getHeight());
        if(dto.getProfile() != null) {
            try {
                String url = s3Service.uploadFile(dto.getProfile());
                user.setProfile(url);
            } catch (Exception e) {
                log.error("파일 업로드 중 에러: {}", e.getMessage());
                throw new InternalServerException("프로필 사진 업로드 중 에러가 발생했습니다");
            }
        }

        return new ResponseEntity<>(new ResponseDto<>(), HttpStatus.OK);
    }

    public ResponseEntity<?> getUserInfoByUserId(String userId) {
        User user = userRepository.findById(userId).orElse(null);
        if(user == null) {
            return new ResponseEntity<>(new ResponseDto<String>(false, "존재하지 않는 사용자입니다"), HttpStatus.NO_CONTENT);
        }
        return new ResponseEntity<>(new ResponseDto<UserInfoDto>(true, new UserInfoDto(user)), HttpStatus.OK);
    }
}

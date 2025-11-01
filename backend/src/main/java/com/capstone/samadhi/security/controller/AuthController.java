package com.capstone.samadhi.security.controller;

import com.capstone.samadhi.common.ResponseDto;
import com.capstone.samadhi.security.dto.LoginDto;
import com.capstone.samadhi.security.dto.SignUpDto;
import com.capstone.samadhi.security.dto.UpdateDto;
import com.capstone.samadhi.security.jwt.JwtUtils;
import com.capstone.samadhi.security.repo.UserRepository;
import com.capstone.samadhi.security.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(value = "/auth")
@Tag(name = "인증/인가", description = "회원 등록 및 회원 가입")
@RequiredArgsConstructor
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "로그인 api")
    public ResponseEntity<?> login(@RequestBody LoginDto dto, HttpServletResponse response) {
        try {
            UsernamePasswordAuthenticationToken tmpToken = new UsernamePasswordAuthenticationToken(
                    dto.getId(), dto.getPwd()
            );

            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(dto.getId(), dto.getPwd())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String token = jwtUtils.generateToken(authentication);

            jwtUtils.saveTokenInCookie(token, response);

            return new ResponseEntity<>(new ResponseDto<String>(true, dto.getId()), HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(new ResponseDto<String>(false, "로그인 정보가 일치하지 않습니다"), HttpStatus.UNAUTHORIZED);
        }
    }

    @PostMapping(value = "/sign-up", consumes = "multipart/form-data")
    @Operation(summary = "회원가입 api")
    public ResponseEntity<?> signUp(@Parameter(description = "회원 정보 데이터") @ModelAttribute SignUpDto dto) {
        return authService.register(dto);
    }

    @PutMapping(value = "/update", consumes = "multipart/form-data")
    @Operation(summary = "내 정보 수정 api")
    public ResponseEntity<?> updateInfo(
            @Parameter(description = "수정 정보 데이터")
            @ModelAttribute UpdateDto dto
    ) {
        return authService.updateInfo(dto);
    }

    @GetMapping(value = "/user")
    @Operation(summary = "유저 정보 반환 api")
    public ResponseEntity<?> getUserInfo(@RequestParam(value = "userId") String userId) {
        return authService.getUserInfoByUserId(userId);
    }
}

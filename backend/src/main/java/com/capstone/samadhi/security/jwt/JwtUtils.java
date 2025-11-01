package com.capstone.samadhi.security.jwt;
import static com.capstone.samadhi.config.Whitelist.*;
import com.capstone.samadhi.security.repo.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Component
@Slf4j
public class JwtUtils {
    private final Key key;
    private final UserRepository userRepository;

    public JwtUtils(@Value("${security.secret.key}") String secretKey, UserRepository userRepository) {
        this.key = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
        this.userRepository = userRepository;
    }

    /**
     * 토큰 생성
     */
    public String create(String userId) {
        Date expireTime = Date.from(Instant.now().plus(1, ChronoUnit.HOURS));

        String jwt = Jwts.builder()
                .signWith(key, SignatureAlgorithm.HS256)
                .setSubject(userId)
                .setIssuedAt(new Date())
                .setExpiration(expireTime)
                .claim("role", "ROLE_ADMIN")
                .compact();
        return jwt;
    }

    public String generateToken(Authentication authentication){
        String username = authentication.getName();
        Date currentDate = new Date();
        Date expireDate = Date.from(Instant.now().plus(1, ChronoUnit.HOURS));

        log.info("expireDate: {}", expireDate);

        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(expireDate)
                .signWith(SecurityConstants.SECRET_KEY, SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * 유효성 검증
     */
    public String validate(String jwt) {
        String subject;

        try {
            subject = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(jwt).getBody().getSubject();
        } catch (ExpiredJwtException e) {
            log.error("access token 만료");
            return null;
        }
        return subject;
    }

    /**
     * 쿠키에 토큰 값 저장
     */
    public void saveTokenInCookie(String token, HttpServletResponse response) {
        Cookie cookie = new Cookie("User-Token", token);
        cookie.setHttpOnly(true);
        int expireTime = 1000*60*60;
        cookie.setMaxAge(expireTime);
        cookie.setPath("/");
        cookie.setSecure(true);
        response.addCookie(cookie);
    }

    /**
     * 요청 헤더에 있는 토큰 값 추출
     * @param request 요청
     * @return 토큰
     */
    public String parseBearerToken(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if(!StringUtils.hasText(authorization) || !authorization.startsWith("Bearer ")) {
            log.error("요청 헤더가 존재하지 않음");
            return null;
        }
        return authorization.substring(7);
    }

    /**
     * 토큰 만료까지 남은 시간
     * @param jwt 토큰
     * @return 만료 시간
     */
    public long getRemainTime(String jwt) {
        Claims claim = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJwt(jwt).getBody();

        Date expiration = claim.getExpiration();
        Date now = new Date();

        return expiration.getTime() - now.getTime();
    }
}

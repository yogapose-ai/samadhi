package com.capstone.samadhi.record.controller;

import com.capstone.samadhi.common.ResponseDto;
import com.capstone.samadhi.common.SecurityUtil;
import com.capstone.samadhi.record.dto.RecordRequest;
import com.capstone.samadhi.record.dto.RecordResponse;
import com.capstone.samadhi.record.service.RecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.nio.file.AccessDeniedException;
import java.security.Security;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/record")
public class RecordController {
    private final RecordService recordService;

    @PostMapping("/")
    @Operation(summary = "레포트 생성", description = "레포트를 생성할 때 사용하는 API")
    @ApiResponses(value={

            @ApiResponse(responseCode="201", description = "레포트 생성 성공"),
            @ApiResponse(responseCode="400", description = "입력값 유효성 검사 실패")
    })
    public ResponseEntity<ResponseDto<RecordResponse>> createMessage(
            @Valid @RequestBody RecordRequest request
    ){
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(recordService.save(SecurityUtil.getCurrentUser(), request));
    }

    @GetMapping("/{record_id}")
    @Operation(summary = "특정 레코드 조회", description = "특정 레코드를 조회할 때 사용하는 API")
    @ApiResponses(value={
            @ApiResponse(responseCode="200", description = "레코드 조회 성공"),
            @ApiResponse(responseCode="403", description = "접근 권한 없음"),
            @ApiResponse(responseCode="404", description = "레코드 찾을 수 없음")
    })
    public ResponseEntity<ResponseDto<RecordResponse>> getRecordById(
            @PathVariable("record_id") Long id
    ) throws AccessDeniedException {
        return ResponseEntity.ok(recordService.findById(SecurityUtil.getCurrentUser(), id));
    }

    @GetMapping("")
    @Operation(summary = "내 레포트 목록 조회", description = "내가 생성한 레포트 목록을 페이징하여 조회합니다.")
    @ApiResponses(value = {

            @ApiResponse(responseCode = "200", description = "조회 성공")
    })
    public ResponseEntity<ResponseDto<List<RecordResponse>>> getMyRecords() {

        ResponseDto<List<RecordResponse>> responseBody = recordService.findByUser(SecurityUtil.getCurrentUser());

        return ResponseEntity.ok(responseBody);
    }
}

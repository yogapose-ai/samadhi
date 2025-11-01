package com.capstone.samadhi.exception;

import com.capstone.samadhi.common.ResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(LoginTokenException.class)
    public ResponseEntity<?> handlerLoginTokenException(LoginTokenException ex) {
        return new ResponseEntity<>(new ResponseDto<String>(false, ex.getMessage()), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(InternalServerException.class)
    public ResponseEntity<?> handlerInternalServerException(InternalServerException ex) {
        return new ResponseEntity<>(new ResponseDto<String>(false, ex.getMessage()), HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleUnexpectedException(Exception ex) {
        log.error(ex.getMessage());
        return new ResponseEntity<>(new ResponseDto<String>(false, "내부 오류가 발생했습니다"), HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

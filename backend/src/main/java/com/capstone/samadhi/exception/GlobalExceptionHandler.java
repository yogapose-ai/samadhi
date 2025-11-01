package com.capstone.samadhi.exception;

import com.capstone.samadhi.common.ResponseDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(LoginTokenException.class)
    public ResponseEntity<?> handlerLoginTokenException(LoginTokenException ex) {
        return new ResponseEntity<>(new ResponseDto<String>(false, ex.getMessage()), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(InternalServerException.class)
    public ResponseEntity<?> handlerInternalServerException(InternalServerException ex) {
        return new ResponseEntity<>(new ResponseDto<String>(false, ex.getMessage()), HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

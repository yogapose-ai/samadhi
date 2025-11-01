package com.capstone.samadhi.common;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ResponseDto<T> {
    private boolean success;
    private T message;

    public ResponseDto() {
        this.success = true;
        this.message = (T) "성공";
    }
}

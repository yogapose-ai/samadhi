"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useWebcamStore } from "@/store/webcamStore";
import { Button } from "@/components/ui/button";

interface StepWebcamProps {
  onComplete: (isActive: boolean) => void;
}

export function StepWebcam({ onComplete }: StepWebcamProps) {
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const {
    stream: webcamStream,
    isActive: isWebcamActive,
    startWebcam,
    stopWebcam,
    isLoading: isWebcamLoading,
    error: webcamError,
  } = useWebcamStore();

  useEffect(() => {
    if (webcamVideoRef.current && webcamStream) {
      webcamVideoRef.current.srcObject = webcamStream;
      webcamVideoRef.current
        .play()
        .catch((e) => console.warn("Webcam Play Failed:", e));
    }
  }, [webcamStream]);

  useEffect(() => {
    onComplete(isWebcamActive);
  }, [isWebcamActive, onComplete]);

  const handleStartWebcam = useCallback(async () => {
    await startWebcam();
    if (webcamError) {
      toast(`웹캠 활성화 실패: ${webcamError}`);
    }
  }, [startWebcam, webcamError]);

  const handleStopWebcam = useCallback(() => {
    stopWebcam();
  }, [stopWebcam]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='flex flex-col items-center justify-center w-full max-w-2xl mx-auto'
    >
      <h2 className='mb-4 text-3xl font-bold text-gray-800'>웹캠 연결하기</h2>
      <p className='mb-8 text-gray-600'>
        자세 분석을 위해 웹캠을 활성화해주세요
      </p>

      <div className='w-full p-8 bg-white border-2 border-gray-200 shadow-lg rounded-xl'>
        <div className='relative flex items-center justify-center w-full mb-6 overflow-hidden bg-gray-200 rounded-lg aspect-video'>
          {!isWebcamActive && !isWebcamLoading && (
            <p className='text-gray-500'>웹캠 미리보기</p>
          )}
          {isWebcamLoading && (
            <div className='w-8 h-8 border-4 border-gray-400 rounded-full border-t-transparent animate-spin'></div>
          )}
          <video
            ref={webcamVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] ${
              isWebcamActive ? "block" : "hidden"
            }`}
          />
        </div>

        <Button
          className='w-full h-14 text-base font-semibold'
          onClick={isWebcamActive ? handleStopWebcam : handleStartWebcam}
          disabled={isWebcamLoading}
        >
          {isWebcamLoading
            ? "웹캠 연결 중..."
            : isWebcamActive
            ? "웹캠 활성화됨 (중지)"
            : "웹캠 활성화"}
        </Button>

        {isWebcamActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className='mt-4 p-4 bg-green-50 border border-green-200 rounded-lg'
          >
            <p className='text-sm font-medium text-green-800'>
              웹캠이 정상적으로 연결되었습니다
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

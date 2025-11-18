"use client";

import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { Video } from "lucide-react";
import { useVideoCanvas } from "@/hooks/useVideoCanvas";

interface VideoCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isInitialized: boolean;
  landmarker: PoseLandmarker | null;
}

export function VideoCanvas({
  videoRef,
  isInitialized,
  landmarker,
}: VideoCanvasProps) {
  const { canvasRef, sourceType } = useVideoCanvas({
    videoRef,
    isInitialized,
    landmarker,
  });

  return (
    <div className='relative overflow-hidden bg-black rounded-lg aspect-video'>
      <video
        ref={videoRef}
        className='absolute inset-0 object-contain w-full h-full opacity-0'
        crossOrigin='anonymous'
        autoPlay
        muted
        playsInline
        loop
      />
      <canvas
        ref={canvasRef}
        className='object-contain w-full h-full'
        style={{ display: sourceType !== "none" ? "block" : "none" }}
      />
      {sourceType === "none" && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='text-center text-gray-400'>
            <Video className='w-16 h-16 mx-auto mb-4 opacity-50' />
            <p>감지할 비디오를 선택하세요</p>
          </div>
        </div>
      )}
    </div>
  );
}

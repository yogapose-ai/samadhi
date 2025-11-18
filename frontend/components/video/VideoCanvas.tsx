"use client";

import { useEffect, useRef } from "react";
import { usePoseStore, useVideoStore } from "@/store";
import { JointAngles } from "@/types/pose";
import {
  DrawingUtils,
  NormalizedLandmark,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";
import { Video } from "lucide-react";
import {
  calculateAllAngles,
  vectorize,
} from "@/lib/mediapipe/angle-calculator";
import { classifyPoseWithVectorized } from "@/lib/poseClassifier/pose-classifier-with-vectorized";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);

  const { video, setVideoData, setPreviousAngles } = usePoseStore();

  const { source, sourceType, isPlaying } = useVideoStore();

  // 비디오 소스 설정
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (sourceType === "stream" && source) {
      const mediaStream = source as MediaStream;
      if (videoElement.srcObject !== mediaStream) {
        videoElement.srcObject = mediaStream;
        videoElement.src = "";
        videoElement.play().catch(() => {});
      }
    } else if (sourceType === "url" && source) {
      const videoPath = source as string;
      videoElement.srcObject = null;
      if (videoElement.src !== videoPath) {
        videoElement.src = videoPath;
        videoElement.play().catch(() => {});
      }
    } else {
      videoElement.srcObject = null;
      videoElement.src = "";
    }
  }, [videoRef, source, sourceType]);

  // 감지 루프 시작/중지
  useEffect(() => {
    if (isPlaying && isInitialized && videoRef.current && landmarker) {
      detectLoop();
    } else if (!isPlaying && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isInitialized, landmarker]);

  const detectLoop = () => {
    if (!videoRef.current || !canvasRef.current || !landmarker || !isPlaying) {
      animationRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    const videoElement = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA && ctx) {
      if (videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0) {
        animationRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      const detectStartTime = performance.now();
      const results = landmarker.detectForVideo(videoElement, detectStartTime);

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const worldLandmarks = results.worldLandmarks?.[0];

        const data = vectorize(
          landmarks,
          videoElement.videoHeight,
          videoElement.videoWidth
        );

        if (worldLandmarks) {
          const angles = calculateAllAngles(
            worldLandmarks,
            video.previousAngles,
            (angles: JointAngles) => setPreviousAngles("video", angles)
          );

          const fps = lastFrameTime.current
            ? Math.round(1000 / (detectStartTime - lastFrameTime.current))
            : 0;
          lastFrameTime.current = detectStartTime;

          // 포즈 분류
          const poseClass = classifyPoseWithVectorized(data, angles);

          // 전체 처리 시간 계산 (ms)
          const latency = Math.round(performance.now() - detectStartTime);

          // Store에 저장
          setVideoData(
            landmarks,
            angles,
            fps,
            data,
            poseClass.bestPose,
            latency
          );

          drawSkeleton(ctx, landmarks);
        } else {
          drawSkeleton(ctx, landmarks);
          // ctx.fillStyle = "#FF9900";
          // ctx.font = "bold 24px Arial";
          // ctx.fillText("처리 중...", 20, 35);
        }
      } else {
        // ctx.fillStyle = "#FFFF00";
        // ctx.font = "bold 24px Arial";
        // ctx.fillText("사람을 찾는 중...", 20, 35);
      }
    }

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(detectLoop);
    }
  };

  const drawSkeleton = (
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[]
  ) => {
    const drawingUtils = new DrawingUtils(ctx);

    drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
      color: "#00FF00",
      lineWidth: 3,
    });

    drawingUtils.drawLandmarks(landmarks, {
      color: "#FFFFFF",
      radius: 3,
      fillColor: "#FFFFFF",
    });
  };

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

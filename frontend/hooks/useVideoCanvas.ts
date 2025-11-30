import { useEffect, useRef } from "react";
import { usePoseStore, useVideoStore } from "@/store";
import { JointAngles } from "@/types/pose";
import {
  DrawingUtils,
  NormalizedLandmark,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";
import {
  calculateAllAngles,
  vectorize,
} from "@/lib/mediapipe/angle-calculator";
import { classifyPoseWithVectorized } from "@/lib/poseClassifier/pose-classifier-with-vectorized";

interface UseVideoCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isInitialized: boolean;
  landmarker: PoseLandmarker | null;
}

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

export function useVideoCanvas({
  videoRef,
  isInitialized,
  landmarker,
}: UseVideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);
  const recentPosesRef = useRef<string[]>([]);

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
          const detectedPose = classifyPoseWithVectorized(
            data,
            angles
          ).bestPose;

          // 최근 10개 프레임의 자세 추적
          recentPosesRef.current.push(detectedPose);
          if (recentPosesRef.current.length > 10) {
            recentPosesRef.current.shift();
          }

          // 10개가 채워졌을 때만 자세 결정
          let finalPoseClass = video.poseClass; // 기본값은 현재 자세 유지
          if (recentPosesRef.current.length >= 10) {
            // 각 자세의 빈도 계산
            const poseCounts = recentPosesRef.current.reduce((acc, pose) => {
              acc[pose] = (acc[pose] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            // 가장 많이 나타나는 자세 찾기
            let mostFrequentPose = "";
            let maxCount = 0;
            for (const [pose, count] of Object.entries(poseCounts)) {
              if (count > maxCount) {
                maxCount = count;
                mostFrequentPose = pose;
              }
            }

            // 8프레임 이상이 같을 때만 자세 업데이트
            if (maxCount >= 8) {
              finalPoseClass = mostFrequentPose;
            }
          }

          // 전체 처리 시간 계산 (ms)
          const latency = Math.round(performance.now() - detectStartTime);

          // Store에 저장
          setVideoData(landmarks, angles, fps, data, finalPoseClass, latency);

          drawSkeleton(ctx, landmarks);
        } else {
          drawSkeleton(ctx, landmarks);
        }
      }
    }

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(detectLoop);
    }
  };

  return {
    canvasRef,
    sourceType,
  };
}

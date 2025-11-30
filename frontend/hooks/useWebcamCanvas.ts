import { useRef, useEffect, useCallback } from "react";
import { JointAngles } from "@/types";
import {
  DrawingUtils,
  Landmark,
  NormalizedLandmark,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";
import {
  calculateAllAngles,
  vectorize,
} from "@/lib/mediapipe/angle-calculator";
import { classifyPoseWithVectorized } from "@/lib/poseClassifier/pose-classifier-with-vectorized";
import { usePoseStore } from "@/store/poseStore";

interface UseWebcamCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
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

const sequenceData: Landmark[][] = [];
const startTime = Date.now();

export function useWebcamCanvas({
  videoRef,
  isActive,
  isInitialized,
  landmarker,
}: UseWebcamCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);

  const { webcam, setWebcamData, setPreviousAngles } = usePoseStore();

  // 포즈 감지 루프
  const detectLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !landmarker || !isActive) {
      animationRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      // 캔버스 크기 조정
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // 비디오 프레임 그리기
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      const detectStartTime = performance.now();
      const results = landmarker.detectForVideo(video, detectStartTime);

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const worldLandmarks = results.worldLandmarks?.[0];

        // 👉 전처리 전, 후 jitter 값 비교를 위한 코드
        // (콘솔창에 찍어 확인하므로 실제 서비스시에는 주석 처리 필요)
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= 10) {
          // getJitter3D(sequenceData);
        } else {
          sequenceData.push(landmarks);
        }

        const data = vectorize(landmarks, video.videoHeight, video.videoWidth);

        // 2D 랜드마크가 감지되었다면, 각도 계산 여부와 관계없이 스켈레톤을 즉시 그림
        drawSkeleton(ctx, landmarks);

        if (worldLandmarks) {
          const angles = calculateAllAngles(
            worldLandmarks,
            webcam.previousAngles,
            (angles: JointAngles) => setPreviousAngles("webcam", angles)
          );

          const fps = lastFrameTime.current
            ? Math.round(1000 / (detectStartTime - lastFrameTime.current))
            : 0;
          lastFrameTime.current = detectStartTime;

        //   const poseClass = classifyPoseWithVectorized(data);

          const latency = Math.round(performance.now() - detectStartTime);

          setWebcamData(
            landmarks,
            angles,
            fps,
            data,
            "unknown",
            latency
          );

          drawSkeleton(ctx, landmarks);
        }
      }
    }

    if (isActive) {
      animationRef.current = requestAnimationFrame(detectLoop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, landmarker, setWebcamData, videoRef]);

  useEffect(() => {
    if (isActive && isInitialized && videoRef.current) {
      detectLoop();
    } else if (!isActive && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isInitialized]);

  return { canvasRef };
}

import { useEffect, useRef, useState } from "react";
import {
  DrawingUtils,
  NormalizedLandmark,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";
import { usePoseStore, useVideoStore } from "@/store";

interface UseVideoCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
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

export function useVideoCanvas({ videoRef }: UseVideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastDetectionTime = useRef<number>(0);

  const workerRef = useRef<Worker | null>(null);
  const [isWorkerInitialized, setIsWorkerInitialized] = useState(false);

  // 🔥 워커가 현재 포즈 추정 중인지 여부 (busy flag)
  const workerBusyRef = useRef<boolean>(false);

  const { video, setVideoData } = usePoseStore();
  const { source, sourceType, isPlaying } = useVideoStore();

  // 워커에서 마지막으로 수신한 랜드마크를 저장하여 드로잉에 사용
  const lastDrawnLandmarks = useRef<NormalizedLandmark[] | null>(null);

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

  // Worker 초기화 및 통신 설정
  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/pose-worker.js", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const {
        type,
        landmarks,
        angles,
        vectorized,
        poseClass,
        fps,
        latency,
      } = event.data;

      if (type === "INITIALIZED") {
        setIsWorkerInitialized(true);
      } else if (type === "RESULT" && landmarks) {
        // 워커가 이 프레임 처리를 끝냈으니 busy 해제
        workerBusyRef.current = false;

        // 최신 포즈 결과 저장 (렌더링 시 사용)
        lastDrawnLandmarks.current = landmarks;

        // Store에 분석 결과 저장
        setVideoData(landmarks, angles, fps, vectorized, poseClass, latency);
      }
    };

    worker.postMessage({ type: "INIT" });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [setVideoData]);

  // 메인 스레드 detectFrame (렌더링 및 "전송 여부 판단" 담당)
  const detectFrame = async (now: number) => {
    const videoElement = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const worker = workerRef.current;

    if (
      !videoElement ||
      !canvas ||
      !ctx ||
      !worker ||
      !videoElement.videoWidth ||
      !videoElement.videoHeight ||
      videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA
    ) {
      return;
    }

    // 성능을 위해 해상도 제한
    videoElement.width = 640;
    videoElement.height = 360;

    const FRAME_INTERVAL = 33; // 30 FPS 목표
    const shouldDetect = now - lastDetectionTime.current >= FRAME_INTERVAL;

    // 캔버스 크기 동기화
    if (
      canvas.width !== videoElement.videoWidth ||
      canvas.height !== videoElement.videoHeight
    ) {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
    }

    // 1. 비디오 프레임 렌더링
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // 2. 이전 프레임의 결과 스켈레톤 드로잉
    if (lastDrawnLandmarks.current) {
      drawSkeleton(ctx, lastDrawnLandmarks.current);
    }

    // 3. 워커가 한가할 때만 새 프레임 전송 (🔥 중요)
    if (shouldDetect && !workerBusyRef.current) {
      try {
        workerBusyRef.current = true; // 워커 점유 시작

        // ImageBitmap 생성 (transferable로 복사 비용 줄이기)
        const imageBitmap = await createImageBitmap(videoElement);

        worker.postMessage(
          {
            type: "DETECT",
            imageBitmap,
            timestamp: now,
            previousAngles: video.previousAngles,
            lastFrameTime: lastDetectionTime.current,
          },
          [imageBitmap] // transfer
        );

        lastDetectionTime.current = now;
      } catch (e) {
        console.error("Worker communication failed:", e);
        workerBusyRef.current = false; // 에러 시에도 busy 해제
      }
    }
  };

  // 감지 루프 시작/중지
  useEffect(() => {
    if (isPlaying && isWorkerInitialized && videoRef.current) {
      const loop = (timestamp: number) => {
        detectFrame(timestamp);
        animationRef.current = requestAnimationFrame(loop);
      };

      animationRef.current = requestAnimationFrame(loop);
    } else if (!isPlaying && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isWorkerInitialized]);

  return {
    canvasRef,
    sourceType,
  };
}

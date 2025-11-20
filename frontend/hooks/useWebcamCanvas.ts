import { useRef, useEffect, useCallback, useState } from "react";
import {
  DrawingUtils,
  NormalizedLandmark,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";
import { usePoseStore } from "@/store/poseStore";

interface UseWebcamCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
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

export function useWebcamCanvas({ videoRef, isActive }: UseWebcamCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastDetectionTime = useRef<number>(0);

  const workerRef = useRef<Worker | null>(null);
  const [isWorkerInitialized, setIsWorkerInitialized] = useState(false);
  
  // 🏃‍➡️ 워커가 현재 포즈 추정 중인지 여부 (busy flag)
  const workerBusyRef = useRef<boolean>(false);
  
  const lastDrawnLandmarks = useRef<NormalizedLandmark[] | null>(null);

  const { webcam, setWebcamData } = usePoseStore();

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/pose-worker.js", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const { type, landmarks, angles, poseClass, fps, latency, vectorized } =
        event.data;

      if (type === "INITIALIZED") {
        setIsWorkerInitialized(true);
      } else if (type === "RESULT" && landmarks) {
        // 🏃‍➡️ 워커가 이 프레임 처리를 끝냈으니 busy 해제
        workerBusyRef.current = false;

        // 워커에서 받은 결과는 저장만 하고, 드로잉은 detectLoop 내에서 실행
        lastDrawnLandmarks.current = landmarks;

        // Store에 분석 결과 저장
        setWebcamData(landmarks, angles, fps, vectorized, poseClass, latency);
      }
    };

    // 워커에게 초기화 요청을 보냅니다.
    worker.postMessage({ type: "INIT" });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 감지 루프 시작/중지
  useEffect(() => {
    if (isActive && isWorkerInitialized && videoRef.current) {
      const loopWrapper = (timestamp: number) => {
        detectLoop(timestamp);
      };
      animationRef.current = requestAnimationFrame(loopWrapper);
    } else if (!isActive && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isWorkerInitialized]);

  // 메인 스레드 detectLoop (렌더링 및 전송 담당)
  const detectLoop = useCallback(
    async (now: number) => {
      const videoElement = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const worker = workerRef.current;

      if (
        !videoElement ||
        !canvas ||
        !ctx ||
        !worker ||
        !isActive ||
        !videoElement.videoWidth
      ) {
        animationRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      // 🏃‍➡️ 성능을 위해 해상도 제한
      videoElement.width = 640;
      videoElement.height = 360;

      const FRAME_INTERVAL = 33; // 30 FPS 목표 (1000ms / 30 = 33.3ms)
      const shouldDetect = now - lastDetectionTime.current >= FRAME_INTERVAL;

      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      // 1. 비디오 프레임 렌더링 (60 FPS 유지)
      ctx.save();

      ctx.translate(-canvas.width, 0);
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // 2. 이전 프레임의 결과 스켈레톤 드로잉 (끊김 방지)
      if (lastDrawnLandmarks.current) {
        drawSkeleton(ctx, lastDrawnLandmarks.current);
      }

      // 🏃‍➡️ 워커가 한가할 때만 프레임 전송
      if (shouldDetect && !workerBusyRef.current) {
        try {
          // 🏃‍➡️ 워커 점유 시작
          workerBusyRef.current = true;
          
          // 3. ImageBitmap 생성
          const imageBitmap = await createImageBitmap(videoElement);

          // 4. 워커로 전송
          worker.postMessage(
            {
              type: "DETECT",
              imageBitmap,
              timestamp: now,
              previousAngles: webcam.previousAngles,
              lastFrameTime: lastDetectionTime.current,
            },
            [imageBitmap]
          );

          lastDetectionTime.current = now;
        } catch (e) {
          console.error("Webcam Worker communication failed:", e);
        }
      }

      if (isActive) {
        animationRef.current = requestAnimationFrame(detectLoop);
      }
    },
    [isActive, videoRef, webcam.previousAngles]
  );

  return { canvasRef };
}

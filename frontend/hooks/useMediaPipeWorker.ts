import { useState, useEffect, useRef, useCallback } from "react";

type DetectResult = {
  landmarks: any;
  worldLandmarks: any;
  timestamp: number;
};

export function useMediaPipeWorker() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef<Map<number, (result: DetectResult) => void>>(
    new Map()
  );

  useEffect(() => {
    // 웹워커 생성
    const worker = new Worker(
      new URL("@/lib/workers/mediapipe.worker.ts", import.meta.url),
      {
        type: "module",
      }
    );

    workerRef.current = worker;

    // 워커 메시지 리스너
    worker.onmessage = (event) => {
      const { type } = event.data;

      switch (type) {
        case "INIT_SUCCESS":
          setIsInitialized(true);
          break;
        case "INIT_ERROR":
          setError(event.data.error);
          break;
        case "DETECT_SUCCESS":
          const callback = callbacksRef.current.get(event.data.timestamp);
          if (callback) {
            callback({
              landmarks: event.data.landmarks,
              worldLandmarks: event.data.worldLandmarks,
              timestamp: event.data.timestamp,
            });
            callbacksRef.current.delete(event.data.timestamp);
          }
          break;
        case "DETECT_ERROR":
          console.error("Detection error:", event.data.error);
          break;
      }
    };

    worker.onerror = (error) => {
      console.error("Worker error:", error);
      setError("Worker error occurred");
    };

    // 초기화 메시지 전송
    worker.postMessage({ type: "INIT" });

    return () => {
      worker.terminate();
    };
  }, []);

  const detectForVideo = useCallback(
    async (
      videoElement: HTMLVideoElement,
      timestamp: number
    ): Promise<DetectResult | null> => {
      if (!workerRef.current || !isInitialized) {
        return null;
      }

      try {
        // 비디오 프레임을 ImageBitmap으로 변환
        const videoFrame = await createImageBitmap(videoElement);

        // 결과를 기다리기 위한 Promise
        return new Promise((resolve) => {
          callbacksRef.current.set(timestamp, resolve);

          // 워커로 전송
          workerRef.current!.postMessage(
            {
              type: "DETECT",
              videoFrame,
              timestamp,
              videoWidth: videoElement.videoWidth,
              videoHeight: videoElement.videoHeight,
            },
            [videoFrame as any] // Transferable objects
          );

          // 타임아웃 설정 (5초)
          setTimeout(() => {
            if (callbacksRef.current.has(timestamp)) {
              callbacksRef.current.delete(timestamp);
              resolve(null);
            }
          }, 5000);
        });
      } catch (error) {
        console.error("Failed to create ImageBitmap:", error);
        return null;
      }
    },
    [isInitialized]
  );

  return {
    isInitialized,
    error,
    detectForVideo,
  };
}

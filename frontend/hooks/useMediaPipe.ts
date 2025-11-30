import { useState, useEffect, useRef } from "react";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export function useMediaPipe() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const webcamLandmarkerRef = useRef<PoseLandmarker | null>(null);

  useEffect(() => {
    async function initMediaPipe() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const createLandmarker = () => {
          const options = {
            baseOptions: {
              modelAssetPath: "/models/pose_landmarker_heavy.task",
              delegate: "GPU" as "GPU" | "CPU",
            },
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputSegmentationMasks: false,
            runningMode: "VIDEO" as const,
          };
          return PoseLandmarker.createFromOptions(vision, options);
        };

        const [videoLandmarker, webcamLandmarker] = await Promise.all([
          createLandmarker(),
          createLandmarker(),
        ]);

        videoLandmarkerRef.current = videoLandmarker;
        webcamLandmarkerRef.current = webcamLandmarker;

        setIsInitialized(true);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to initialize";
        setError(message);
      }
    }

    initMediaPipe();

    return () => {
      videoLandmarkerRef.current?.close();
      webcamLandmarkerRef.current?.close();
    };
  }, []);

  return {
    videoLandmarker: videoLandmarkerRef.current,
    webcamLandmarker: webcamLandmarkerRef.current,
    isInitialized,
    error,
  };
}

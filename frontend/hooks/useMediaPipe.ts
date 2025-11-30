import { useState, useEffect, useRef } from "react";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export function useMediaPipe() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const webcamLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const imageLandmarkerRef = useRef<PoseLandmarker | null>(null);

  useEffect(() => {
    async function initMediaPipe() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const createLandmarker = (runningMode?: string) => {
          const options = {
            baseOptions: {
              modelAssetPath: "/models/pose_landmarker_heavy.task",
              delegate: "GPU" as "GPU" | "CPU",
            },
            numPoses: 1,
            minPoseDetectionConfidence: 0.2,
            minPosePresenceConfidence: 0.2,
            minTrackingConfidence: 0.5,
            outputSegmentationMasks: false,
            runningMode:
              (runningMode as "VIDEO" | "IMAGE") || ("VIDEO" as const),
          };
          return PoseLandmarker.createFromOptions(vision, options);
        };

        const [videoLandmarker, webcamLandmarker, imageLandmarker] =
          await Promise.all([
            createLandmarker(),
            createLandmarker(),
            createLandmarker("IMAGE"),
          ]);

        videoLandmarkerRef.current = videoLandmarker;
        webcamLandmarkerRef.current = webcamLandmarker;
        imageLandmarkerRef.current = imageLandmarker;

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
      imageLandmarkerRef.current?.close();
    };
  }, []);

  return {
    videoLandmarker: videoLandmarkerRef.current,
    webcamLandmarker: webcamLandmarkerRef.current,
    imageLandmarker: imageLandmarkerRef.current,
    isInitialized,
    error,
  };
}

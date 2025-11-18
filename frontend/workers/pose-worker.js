import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import {
  calculateAllAngles,
  vectorize,
} from "@/lib/mediapipe/angle-calculator";
import { classifyPoseWithVectorized } from "@/lib/poseClassifier/pose-classifier-with-vectorized";

let landmarker = null;
let isInitialized = false;

async function initializeLandmarker() {
  const modelUrl = new URL(
    "/models/pose_landmarker_heavy.task",
    self.location.origin
  ).href;

  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: modelUrl,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
  });
  isInitialized = true;
  postMessage({ type: "INITIALIZED" });
}

self.onmessage = async (event) => {
  const { type, imageBitmap, previousAngles, timestamp, lastFrameTime } =
    event.data;

  if (type === "INIT") {
    initializeLandmarker();
  } else if (type === "DETECT" && isInitialized && imageBitmap) {
    const detectStartTime = performance.now();
    const results = landmarker.detectForVideo(imageBitmap, timestamp);

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      const worldLandmarks = results.worldLandmarks?.[0];

      if (worldLandmarks) {
        const data = vectorize(
          landmarks,
          imageBitmap.height,
          imageBitmap.width
        );

        const angles = calculateAllAngles(
          worldLandmarks,
          previousAngles,
          (_) => {}
        );

        const poseClass = classifyPoseWithVectorized(data, angles);

        const latency = Math.round(performance.now() - detectStartTime);
        const fps = lastFrameTime
          ? Math.round(1000 / (detectStartTime - lastFrameTime))
          : 0;

        postMessage({
          type: "RESULT",
          landmarks: landmarks,
          angles: angles,
          vectorized: data,
          poseClass: poseClass.bestPose,
          fps: fps,
          latency: latency,
        });
      }
    }
  }
};

import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

type WorkerMessage =
  | { type: "INIT" }
  | {
      type: "DETECT";
      videoFrame: ImageBitmap;
      timestamp: number;
      videoWidth: number;
      videoHeight: number;
    };

type WorkerResponse =
  | { type: "INIT_SUCCESS" }
  | { type: "INIT_ERROR"; error: string }
  | {
      type: "DETECT_SUCCESS";
      landmarks: any;
      worldLandmarks: any;
      timestamp: number;
    }
  | { type: "DETECT_ERROR"; error: string };

let poseLandmarker: PoseLandmarker | null = null;

async function initMediaPipe() {
  console.log("Worker init starting (Module Mode)...");
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    const modelPath = new URL(
      "/models/pose_landmarker_heavy.task",
      self.location.origin
    ).href;

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelPath,
        delegate: "GPU",
      },
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
      runningMode: "VIDEO",
    });

    const response: WorkerResponse = { type: "INIT_SUCCESS" };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      type: "INIT_ERROR",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    self.postMessage(response);
  }
}

function detectPose(
  videoFrame: ImageBitmap,
  timestamp: number,
  width: number,
  height: number
) {
  if (!poseLandmarker) {
    const response: WorkerResponse = {
      type: "DETECT_ERROR",
      error: "Landmarker not initialized",
    };
    self.postMessage(response);
    return;
  }

  try {
    const offscreenCanvas = new OffscreenCanvas(width, height);
    const ctx = offscreenCanvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    ctx.drawImage(videoFrame, 0, 0, width, height);

    const results = poseLandmarker.detectForVideo(
      offscreenCanvas as any,
      timestamp
    );

    videoFrame.close();

    const response: WorkerResponse = {
      type: "DETECT_SUCCESS",
      landmarks: results.landmarks,
      worldLandmarks: results.worldLandmarks,
      timestamp,
    };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      type: "DETECT_ERROR",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    self.postMessage(response);
  }
}

self.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;

  switch (type) {
    case "INIT":
      initMediaPipe();
      break;
    case "DETECT":
      detectPose(
        event.data.videoFrame,
        event.data.timestamp,
        event.data.videoWidth,
        event.data.videoHeight
      );
      break;
  }
});

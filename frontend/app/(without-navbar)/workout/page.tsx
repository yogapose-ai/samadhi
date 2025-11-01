"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { useCanvasCapture } from "@/hooks/useCanvasCapture";
import { WebcamCanvas } from "@/components/webcam/WebcamCanvas";
import { Button } from "@/components/ui/button";
import { usePoseStore } from "@/store/poseStore";
import { useVideoStore } from "@/store/videoStore";
import { useWebcamStore } from "@/store/webcamStore";
import { FiSettings, FiX, FiEye, FiEyeOff } from "react-icons/fi";
import WorkoutSettingsModal from "@/components/workout/WorkoutSettingsModal";
import { CalculateSimilarity } from "@/lib/mediapipe/angle-calculator";
import { VideoCanvas } from "@/components/video/VideoCanvas";
import { VideoControls } from "@/components/video/VideoControls";
import { motion, AnimatePresence } from "framer-motion";
import ExitConfirmModal from "@/components/workout/ExitConfirmModal";
import { toast } from "sonner";
import TimelineClipper from "@/components/timeline/TimelineClipper";

function useWebcamLifecycle(isReady: boolean) {
  const startWebcam = useWebcamStore((state) => state.startWebcam);
  const stopWebcam = useWebcamStore((state) => state.stopWebcam);
  const isWebcamActive = useWebcamStore((state) => state.isActive);

  useEffect(() => {
    if (isReady) {
      startWebcam();
      return () => {
        stopWebcam();
      };
    }
  }, [isReady, startWebcam, stopWebcam]);

  return { isWebcamActive };
}

function useScreenShareMonitor(
  isScreenShare: boolean,
  source: string | MediaStream | null,
  onScreenShareEnd: () => void
) {
  useEffect(() => {
    if (!isScreenShare || !source) return;

    const stream = source as MediaStream;
    const videoTrack = stream.getVideoTracks()[0];

    if (!videoTrack) {
      return;
    }

    const handleEnded = () => {
      toast.error("화면 공유가 종료되었습니다.");
      onScreenShareEnd();
    };

    videoTrack.addEventListener("ended", handleEnded);

    return () => {
      videoTrack.removeEventListener("ended", handleEnded);
    };
  }, [isScreenShare, source, onScreenShareEnd]);
}

function useVideoSync(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  sourceType: string,
  isReady: boolean
) {
  const { setPlaying, setCurrentTime, setDuration } = useVideoStore();

  useEffect(() => {
    const video = videoRef?.current;
    if (!video || sourceType !== "url" || !isReady) return;

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);

    setPlaying(!video.paused);
    if (video.duration) setDuration(video.duration);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
    };
  }, [sourceType, isReady, setPlaying, setCurrentTime, setDuration, videoRef]);
}

function useWebcamVideoElement(
  webcamVideoRef: React.RefObject<HTMLVideoElement | null>,
  webcamStream: MediaStream | null,
  isWebcamActive: boolean
) {
  useEffect(() => {
    if (!webcamStream || !isWebcamActive) {
      return;
    }

    const setupVideo = (retry = 0) => {
      const video = webcamVideoRef.current;

      if (!video) {
        if (retry < 5) setTimeout(() => setupVideo(retry + 1), 100);
        return;
      }

      if (video.srcObject !== webcamStream) {
        video.srcObject = webcamStream;
      }

      video
        .play()
        .then(() => {})
        .catch((error) => {
          if (retry < 5) setTimeout(() => setupVideo(retry + 1), 200);
        });
    };

    setupVideo();
  }, [webcamStream, isWebcamActive, webcamVideoRef]);
}

export default function WorkoutPage() {
  const router = useRouter();
  const { videoLandmarker, webcamLandmarker, isInitialized } = useMediaPipe();
  const { webcam, video } = usePoseStore();
  const {
    source,
    sourceType,
    isPlaying,
    currentTime,
    duration,
    setCurrentTime,
  } = useVideoStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStream = useWebcamStore((state) => state.stream);

  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    hideVideo: false,
    hideWebcam: false,
    videoSize: 50,
  });
  const [showSimilarity, setShowSimilarity] = useState(true);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  // canvas 캡쳐 hook
  //   useCanvasCapture({
  //     poseClass: video.poseClass,
  //     enabled: true,
  //   });

  const isScreenShare = sourceType === "stream";
  const isReady = isSetupComplete && isInitialized;

  const { isWebcamActive } = useWebcamLifecycle(isReady);

  useScreenShareMonitor(isScreenShare, source, () => {
    setTimeout(() => router.back(), 500);
  });

  const prevIsScreenShareRef = useRef(isScreenShare);

  useEffect(() => {
    if (prevIsScreenShareRef.current === true && isScreenShare === false) {
      router.back();
    }
    prevIsScreenShareRef.current = isScreenShare;
  }, [isScreenShare, router]);

  useVideoSync(videoRef, sourceType, isReady);
  useWebcamVideoElement(webcamVideoRef, webcamStream, isWebcamActive);

  useEffect(() => {
    if (source && isInitialized) {
      setIsSetupComplete(true);
    }
  }, [source, isInitialized]);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
    };
  }, []);

  const handleExit = () => setIsExitModalOpen(true);

  const handleConfirmExit = () => {
    router.push("/");
  };

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play() : video.pause();
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  const P1 = webcam.vectorized;
  const P2 = video.vectorized;
  const similarityValue = CalculateSimilarity(P1, P2);

  const videoContainerWidth = !settings.hideVideo
    ? settings.hideWebcam
      ? "100%"
      : `${settings.videoSize}%`
    : "0%";

  const webcamContainerWidth = !settings.hideWebcam
    ? settings.hideVideo
      ? "100%"
      : `${100 - settings.videoSize}%`
    : "0%";

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 text-center bg-white rounded-lg shadow-lg">
          <div className="w-10 h-10 mx-auto mb-4 border-4 border-blue-400 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-600">운동 데이터를 준비 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <header className="flex items-center justify-between px-4 py-2 bg-black/80 backdrop-blur-sm z-40 shrink-0">
        <Button
          variant="outline"
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center justify-center gap-2 w-20 bg-white/10 border-white/20 text-white hover:bg-white hover:text-black"
        >
          <FiSettings className="w-4 h-4" />
          <span className="hidden sm:inline">설정</span>
        </Button>

        <div className="flex-1"></div>

        <Button
          variant="outline"
          onClick={handleExit}
          className="flex items-center justify-center gap-2 w-20 bg-white/10 border-white/20 text-white hover:text-white hover:bg-red-600 hover:border-red-600"
        >
          <FiX className="w-4 h-4" />
          <span className="hidden sm:inline">종료</span>
        </Button>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <div
          className="transition-all duration-300 flex items-center justify-center bg-black h-full"
          style={{
            width: videoContainerWidth,
            padding: settings.hideVideo ? "0" : "1rem",
            overflow: "hidden",
          }}
        >
          <div className="w-full max-w-full">
            <VideoCanvas
              videoRef={videoRef}
              isInitialized={isInitialized}
              landmarker={videoLandmarker}
            />
            {!isScreenShare && (
              <div className="p-2 bg-black/50 rounded-b-lg">
                <VideoControls
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={duration}
                  onTogglePlay={handleTogglePlay}
                  onSeek={handleSeek}
                />
              </div>
            )}
          </div>
        </div>

        <div
          className="transition-all duration-300 flex items-center justify-center bg-black h-full"
          style={{
            width: webcamContainerWidth,
            padding: settings.hideWebcam ? "0" : "1rem",
            overflow: "hidden",
          }}
        >
          <div className="w-full max-w-full">
            <WebcamCanvas
              videoRef={webcamVideoRef}
              isActive={isWebcamActive}
              isInitialized={isInitialized}
              landmarker={webcamLandmarker}
            />
            {!isScreenShare && (
              <div className="p-2" style={{ visibility: "hidden" }}>
                <VideoControls
                  isPlaying={false}
                  currentTime={0}
                  duration={0}
                  onTogglePlay={() => {}}
                  onSeek={() => {}}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <TimelineClipper />

      <AnimatePresence>
        {showSimilarity && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-8 right-8 z-30"
          >
            <div
              className="relative rounded-2xl shadow-2xl p-6 min-w-[180px]"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #3A6BFC 0%, #19AFFF 100%)",
              }}
            >
              <button
                onClick={() => setShowSimilarity(false)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
              >
                <FiEyeOff className="w-3 h-3 text-white" />
              </button>
              <div className="text-center">
                <p className="text-xs font-medium text-white/80 mb-1">
                  자세 유사도
                </p>
                <div className="text-4xl font-bold text-white mb-1 w-36 text-center">
                  {similarityValue.toFixed(1)}%
                </div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-white rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${similarityValue}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showSimilarity && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowSimilarity(true)}
          className="fixed bottom-8 right-8 z-30 w-12 h-12 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg"
          style={{
            backgroundImage: "linear-gradient(90deg, #3A6BFC 0%, #19AFFF 100%)",
          }}
        >
          <FiEye className="w-6 h-6 text-white" />
        </motion.button>
      )}

      <WorkoutSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      <ExitConfirmModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        onConfirm={handleConfirmExit}
      />
    </div>
  );
}

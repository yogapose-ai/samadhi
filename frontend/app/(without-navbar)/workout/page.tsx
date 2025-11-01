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
import TimelineClipper from "@/components/timeline/TimelineClipper";

export default function WorkoutPage() {
  const router = useRouter();
  const { videoLandmarker, webcamLandmarker, isInitialized } = useMediaPipe();
  const { webcam, video } = usePoseStore();

  const {
    source,
    sourceType,
    isPlaying,
    setPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
  } = useVideoStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const isUnmountingRef = useRef(false);

  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const {
    stream: webcamStream,
    isActive: isWebcamActive,
    stopWebcam,
  } = useWebcamStore();

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

  useEffect(() => {
    if (source && isInitialized) {
      setIsSetupComplete(true);
    }
  }, [source, isInitialized]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || sourceType !== "url" || !isSetupComplete) return;

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(videoElement.currentTime);
    const handleDurationChange = () => setDuration(videoElement.duration);

    videoElement.addEventListener("play", handlePlay);
    videoElement.addEventListener("pause", handlePause);
    videoElement.addEventListener("timeupdate", handleTimeUpdate);
    videoElement.addEventListener("durationchange", handleDurationChange);

    setPlaying(!videoElement.paused);
    if (videoElement.duration) {
      setDuration(videoElement.duration);
    }

    return () => {
      videoElement.removeEventListener("play", handlePlay);
      videoElement.removeEventListener("pause", handlePause);
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
      videoElement.removeEventListener("durationchange", handleDurationChange);
    };
  }, [sourceType, isSetupComplete, setPlaying, setCurrentTime, setDuration]);

  useEffect(() => {
    const handleRouteChange = () => {
      isUnmountingRef.current = true;
      if (videoRef.current) videoRef.current.pause();
      stopWebcam();
    };
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, [stopWebcam]);

  useEffect(() => {
    if (webcamStream && isWebcamActive) {
      const checkAndPlay = (retryCount = 0) => {
        if (isUnmountingRef.current) return;
        const videoElement = webcamVideoRef.current;
        const MAX_RETRIES = 5;
        if (!videoElement) {
          if (retryCount < MAX_RETRIES) {
            setTimeout(() => checkAndPlay(retryCount + 1), 100);
          }
          return;
        }
        if (videoElement.srcObject !== webcamStream) {
          videoElement.srcObject = webcamStream;
        }
        videoElement.play().catch((e) => {
          if (!isUnmountingRef.current && retryCount < MAX_RETRIES) {
            setTimeout(() => checkAndPlay(retryCount + 1), 200);
          }
        });
      };
      checkAndPlay(0);
    }
  }, [webcamStream, isWebcamActive]);

  const handleExit = () => {
    setIsExitModalOpen(true);
  };

  const handleConfirmExit = () => {
    isUnmountingRef.current = true;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
    stopWebcam();
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

  if (!isSetupComplete || !isInitialized) {
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

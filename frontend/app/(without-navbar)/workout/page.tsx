"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useMediaPipeWorker } from "@/hooks/useMediaPipeWorker";
import { WebcamCanvas } from "@/components/webcam/WebcamCanvas";
import { Button } from "@/components/ui/button";
import { usePoseStore } from "@/store/poseStore";
import { useVideoStore } from "@/store/videoStore";
import { useWebcamStore } from "@/store/webcamStore";
import { FiSettings, FiX } from "react-icons/fi";
import WorkoutSettingsModal from "@/components/workout/WorkoutSettingsModal";
import { CalculateSimilarity } from "@/lib/mediapipe/angle-calculator";
import { VideoCanvas } from "@/components/video/VideoCanvas";
import { VideoControls } from "@/components/video/VideoControls";
import ExitConfirmModal from "@/components/workout/ExitConfirmModal";
import { toast } from "sonner";
import TimelineClipper, {
  type TimelineClipperRef,
} from "@/components/timeline/TimelineClipper";
import SimilarityDisplay from "@/components/workout/SimilarityDisplay";
import api from "@/lib/axios";
import { PerformanceMonitor } from "@/components/workout/PerformanceMonitor";
import { ModelLoadingOverlay } from "@/components/workout/ModelLoadingOverlay";

function useWebcamLifecycle(isReady: boolean) {
  const startWebcam = useWebcamStore((state) => state.startWebcam);
  const stopWebcam = useWebcamStore((state) => state.stopWebcam);
  const isWebcamActive = useWebcamStore((state) => state.isActive);

  useEffect(() => {
    // 모델이 완전히 로드된 후에만 웹캠 시작
    if (isReady) {
      console.log("✅ 모델 로딩 완료, 웹캠 시작");
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
  isWebcamActive: boolean,
  isReady: boolean
) {
  useEffect(() => {
    if (!webcamStream || !isWebcamActive || !isReady) {
      return;
    }

    let mounted = true;
    let retryTimeout: NodeJS.Timeout | null = null;

    const setupVideo = async (retry = 0) => {
      if (!mounted) return;

      const video = webcamVideoRef.current;

      if (!video) {
        if (retry < 10) {
          retryTimeout = setTimeout(() => setupVideo(retry + 1), 100);
        } else {
          console.error("웹캠 비디오 엘리먼트를 찾을 수 없습니다.");
        }
        return;
      }

      try {
        // 이전 스트림 정리
        if (video.srcObject && video.srcObject !== webcamStream) {
          const oldStream = video.srcObject as MediaStream;
          oldStream.getTracks().forEach((track) => track.stop());
          video.srcObject = null;
        }

        // 새 스트림 설정
        if (video.srcObject !== webcamStream) {
          video.srcObject = webcamStream;

          // 메타데이터 로드 대기
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error("Metadata timeout")),
              5000
            );
            video.onloadedmetadata = () => {
              clearTimeout(timeout);
              resolve();
            };
            video.onerror = () => {
              clearTimeout(timeout);
              reject(new Error("Video load error"));
            };
          });
        }

        // 재생
        if (video.paused) {
          await video.play();
        }

        console.log(`웹캠 비디오 재생 성공 (시도 ${retry + 1})`);
      } catch (error) {
        console.warn(`웹캠 설정 실패 (시도 ${retry + 1}):`, error);

        if (retry < 10 && mounted) {
          retryTimeout = setTimeout(() => setupVideo(retry + 1), 300);
        } else {
          console.error("웹캠 설정 최종 실패:", error);
          toast.error("웹캠 연결에 실패했습니다. 페이지를 새로고침해주세요.");
        }
      }
    };

    setupVideo();

    return () => {
      mounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);

      const video = webcamVideoRef.current;
      if (video) {
        video.pause();
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
          video.srcObject = null;
        }
      }
    };
  }, [webcamStream, isWebcamActive, isReady, webcamVideoRef]);
}

function WorkoutContent() {
  const router = useRouter();

  // 1. 영상용 워커
  const {
    isInitialized: isVideoPipeReady,
    error: videoWorkerError,
    detectForVideo: detectForGuideVideo,
  } = useMediaPipeWorker();

  // 2. 웹캠용 워커
  const {
    isInitialized: isWebcamPipeReady,
    error: webcamWorkerError,
    detectForVideo: detectForWebcam,
  } = useMediaPipeWorker();

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
  const timelineClipperRef = useRef<TimelineClipperRef>(null);
  const webcamStream = useWebcamStore((state) => state.stream);
  const workoutStartTimeRef = useRef<number>(Date.now());

  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    hideVideo: false,
    hideWebcam: false,
    videoSize: 50,
  });
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const isScreenShare = sourceType === "stream";

  const isInitialized = isVideoPipeReady && isWebcamPipeReady;
  const isReady = isSetupComplete && isInitialized;

  const [isSubmitting, setIsSubmitting] = useState(false);

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
  useWebcamVideoElement(webcamVideoRef, webcamStream, isWebcamActive, isReady);

  // 새로고침 감지 및 리다이렉트 (페이지 마운트 시 한 번만 실행)
  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === "undefined") return;

    // source가 없으면 새로고침으로 간주하여 /ready로 리다이렉트 (짧은 지연 후 체크)
    const timeoutId = setTimeout(() => {
      if (!source) {
        router.push("/ready");
      }
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 한 번만 실행

  useEffect(() => {
    if (source && isInitialized) {
      console.log("✅ Source와 모델 초기화 완료");
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

  const handleConfirmExit = async () => {
    try {
      setIsSubmitting(true);

      // 타임라인 데이터 가져오기
      const timelines = timelineClipperRef.current?.getTimelines() || [];
      const startTime =
        timelineClipperRef.current?.getStartTime() ||
        workoutStartTimeRef.current;

      if (timelines.length === 0) {
        toast.error("저장할 운동 데이터가 없습니다.");
        setIsSubmitting(false);
        return;
      }

      // 운동 시간 계산 (분 단위)
      const endTime = Date.now();
      const workingoutTime = Math.floor((endTime - startTime) / 1000 / 60);

      // 총 점수 계산 (평균 유사도)
      const totalScore = Math.round(
        timelines.reduce((sum, t) => sum + t.similarity, 0) / timelines.length
      );

      // 유튜브 URL (현재는 source를 URL로 사용, 스크린 공유인 경우 처리)
      const youtubeUrl =
        sourceType === "url" && typeof source === "string"
          ? source
          : sourceType === "stream"
          ? "screen-share"
          : "";

      // 타임라인 데이터 변환 (첫 시작 시간 기준 상대 시간)
      const timelineData = timelines.map((timeline) => {
        const startTimeSec = Math.floor(
          (timeline.startTime - startTime) / 1000
        );
        const endTimeSec = Math.floor(
          ((timeline.endTime || Date.now()) - startTime) / 1000
        );

        return {
          youtube_start_sec: startTimeSec,
          youtube_end_sec: endTimeSec,
          pose: timeline.pose,
          score: Math.round(timeline.similarity),
        };
      });

      // 서버에 전송할 데이터 (백엔드 형식에 맞춤)
      const recordData = {
        datetime: new Date().toISOString(),
        workingout_time: workingoutTime,
        youtube_url: youtubeUrl,
        total_score: totalScore,
        timeLineList: timelineData, // 백엔드 RecordRequest의 필드명과 일치
      };

      // API 호출
      const res = await api.post("/api/record/", recordData);

      const newId = res?.data?.message?.id; // 백엔드 응답 키에 맞춰 조정

      if (newId) {
        toast.success("운동 기록이 저장되었습니다.");
        router.push(`/record?openId=${newId}`); // ✅ 목록을 거치지 않고 곧바로 상세
        return;
      }
    } catch (error: any) {
      console.error("운동 기록 저장 실패:", error);
      toast.error(
        error.response?.data?.message || "운동 기록 저장에 실패했습니다."
      );
      setIsSubmitting(false);
    }
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

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* 모델 로딩 오버레이 */}
      <ModelLoadingOverlay />

      <header className="flex items-center justify-between px-4 py-2 bg-black/80 backdrop-blur-sm z-40 shrink-0">
        <Button
          variant="outline"
          onClick={() => setIsSettingsOpen(true)}
          disabled={!isReady}
          className="flex items-center justify-center gap-2 w-20 bg-white/10 border-white/20 text-white hover:bg-white hover:text-black disabled:opacity-50"
        >
          <FiSettings className="w-4 h-4" />
          <span className="hidden sm:inline">설정</span>
        </Button>

        <div className="flex-1"></div>

        <Button
          variant="outline"
          onClick={handleExit}
          disabled={!isReady}
          className="flex items-center justify-center gap-2 w-20 bg-white/10 border-white/20 text-white hover:text-white hover:bg-red-600 hover:border-red-600 disabled:opacity-50"
        >
          <FiX className="w-4 h-4" />
          <span className="hidden sm:inline">종료</span>
        </Button>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <div
          className="transition-all duration-300 flex items-start justify-center bg-black h-full pt-8"
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
              detectForVideo={detectForGuideVideo}
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
          className="transition-all duration-300 flex items-start justify-center bg-black h-full pt-8"
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
              detectForVideo={detectForWebcam}
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

      <PerformanceMonitor />

      <TimelineClipper ref={timelineClipperRef} />

      <SimilarityDisplay similarityValue={similarityValue} />

      <WorkoutSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      <ExitConfirmModal
        isOpen={isExitModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsExitModalOpen(false);
          }
        }}
        onConfirm={handleConfirmExit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-black">
          <div className="p-8 text-center bg-gray-900 rounded-lg shadow-lg border border-white/10">
            <div className="w-10 h-10 mx-auto mb-4 border-4 border-blue-400 rounded-full border-t-transparent animate-spin"></div>
            <p className="text-gray-300">페이지를 불러오는 중...</p>
          </div>
        </div>
      }
    >
      <WorkoutContent />
    </Suspense>
  );
}

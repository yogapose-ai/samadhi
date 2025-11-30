import { useState } from "react";
import { FiActivity, FiX } from "react-icons/fi";
import { usePoseStore } from "@/store/poseStore";

export function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(true);
  const webcamFps = usePoseStore((state) => state.webcam.fps);
  const videoFps = usePoseStore((state) => state.video.fps);
  const webcamLatency = usePoseStore((state) => state.webcam.latency);
  const videoLatency = usePoseStore((state) => state.video.latency);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className='fixed top-20 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 border border-white/20 rounded-lg backdrop-blur-sm transition-all'
        title='성능 모니터 표시'
      >
        <FiActivity className='w-4 h-4 text-white' />
      </button>
    );
  }

  return (
    <div className='fixed top-20 right-4 z-50 bg-black/70 backdrop-blur-md border border-white/20 rounded-lg p-3 min-w-40 shadow-lg'>
      <div className='flex items-center justify-between mb-2'>
        <h3 className='text-xs font-semibold text-white/80 flex items-center gap-1'>
          <FiActivity className='w-3 h-3' />
          성능 모니터
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className='p-1 hover:bg-white/10 rounded transition-colors'
          title='숨기기'
        >
          <FiX className='w-3 h-3 text-white/60' />
        </button>
      </div>

      <div className='space-y-2'>
        {/* 웹캠 FPS */}
        <div className='flex items-center justify-between'>
          <span className='text-xs text-white/60'>웹캠 FPS:</span>
          <span
            className={`text-xs font-mono font-semibold ${
              webcamFps >= 25
                ? "text-green-400"
                : webcamFps >= 15
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {webcamFps}
          </span>
        </div>

        {/* 웹캠 응답시간 */}
        <div className='flex items-center justify-between'>
          <span className='text-xs text-white/60'>웹캠 응답:</span>
          <span
            className={`text-xs font-mono font-semibold ${
              webcamLatency <= 50
                ? "text-green-400"
                : webcamLatency <= 100
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {webcamLatency}ms
          </span>
        </div>

        {/* 비디오 FPS */}
        <div className='flex items-center justify-between'>
          <span className='text-xs text-white/60'>비디오 FPS:</span>
          <span
            className={`text-xs font-mono font-semibold ${
              videoFps >= 25
                ? "text-green-400"
                : videoFps >= 15
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {videoFps}
          </span>
        </div>

        {/* 비디오 응답시간 */}
        <div className='flex items-center justify-between'>
          <span className='text-xs text-white/60'>비디오 응답:</span>
          <span
            className={`text-xs font-mono font-semibold ${
              videoLatency <= 50
                ? "text-green-400"
                : videoLatency <= 100
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {videoLatency}ms
          </span>
        </div>

        {/* 성능 상태 인디케이터 */}
        <div className='pt-2 border-t border-white/10'>
          <div className='flex items-center gap-1'>
            <div
              className={`w-2 h-2 rounded-full ${
                webcamFps >= 15 &&
                videoFps >= 15 &&
                webcamLatency <= 100 &&
                videoLatency <= 100
                  ? "bg-green-400 animate-pulse"
                  : "bg-red-400"
              }`}
            />
            <span className='text-[10px] text-white/50'>
              {webcamFps >= 15 &&
              videoFps >= 15 &&
              webcamLatency <= 100 &&
              videoLatency <= 100
                ? "정상"
                : "성능 저하"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

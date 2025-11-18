"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiEye, FiEyeOff, FiRefreshCw } from "react-icons/fi";
import { Button } from "@/components/ui/button";

interface WorkoutSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    hideVideo: boolean;
    hideWebcam: boolean;
    videoSize: number;
  };
  onSettingsChange: (settings: {
    hideVideo: boolean;
    hideWebcam: boolean;
    videoSize: number;
  }) => void;
}

export function WorkoutSettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: WorkoutSettingsModalProps) {
  const handleToggleVideo = () => {
    if (settings.hideWebcam && !settings.hideVideo) {
      return;
    }
    onSettingsChange({ ...settings, hideVideo: !settings.hideVideo });
  };

  const handleToggleWebcam = () => {
    if (settings.hideVideo && !settings.hideWebcam) {
      return;
    }
    onSettingsChange({ ...settings, hideWebcam: !settings.hideWebcam });
  };

  const handleVideoSizeChange = (value: number) => {
    onSettingsChange({ ...settings, videoSize: value });
  };

  const handleResetVideoSize = () => {
    onSettingsChange({ ...settings, videoSize: 50 });
  };

  const isVideoToggleDisabled = settings.hideWebcam && !settings.hideVideo;
  const isWebcamToggleDisabled = settings.hideVideo && !settings.hideWebcam;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='fixed inset-0 z-50 bg-black/50'
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className='fixed z-50 w-full max-w-md p-6 bg-white rounded-xl shadow-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
          >
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-2xl font-bold text-gray-800'>화면 설정</h2>
              <button
                onClick={onClose}
                className='p-2 text-gray-500 transition-colors rounded-lg hover:bg-gray-100'
              >
                <FiX className='w-6 h-6' />
              </button>
            </div>

            <div className='space-y-6'>
              <p className='text-sm text-gray-600'>
                운동 영상과 웹캠은 항상 실행되며, 화면에서만 가릴 수 있습니다.
              </p>

              <div className='flex items-center justify-between p-4 border rounded-lg'>
                <div className='flex items-center gap-3'>
                  {settings.hideVideo ? (
                    <FiEyeOff className='w-5 h-5 text-gray-400' />
                  ) : (
                    <FiEye className='w-5 h-5 text-[#3A6BFC]' />
                  )}
                  <div>
                    <h3 className='font-semibold text-gray-800'>운동 영상</h3>
                    <p className='text-sm text-gray-500'>
                      {settings.hideVideo ? "화면에서 가려짐" : "화면에 표시됨"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleVideo}
                  disabled={isVideoToggleDisabled}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    settings.hideVideo ? "bg-gray-300" : "bg-[#3A6BFC]"
                  } ${
                    isVideoToggleDisabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <motion.div
                    animate={{
                      x: settings.hideVideo ? 2 : 26,
                    }}
                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                    className='absolute w-6 h-6 bg-white rounded-full shadow-md top-1 left-0'
                  />
                </button>
              </div>

              <div className='flex items-center justify-between p-4 border rounded-lg'>
                <div className='flex items-center gap-3'>
                  {settings.hideWebcam ? (
                    <FiEyeOff className='w-5 h-5 text-gray-400' />
                  ) : (
                    <FiEye className='w-5 h-5 text-[#3A6BFC]' />
                  )}
                  <div>
                    <h3 className='font-semibold text-gray-800'>
                      웹캠 (내 자세)
                    </h3>
                    <p className='text-sm text-gray-500'>
                      {settings.hideWebcam
                        ? "화면에서 가려짐"
                        : "화면에 표시됨"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleWebcam}
                  disabled={isWebcamToggleDisabled}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    settings.hideWebcam ? "bg-gray-300" : "bg-[#3A6BFC]"
                  } ${
                    isWebcamToggleDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <motion.div
                    animate={{
                      x: settings.hideWebcam ? 2 : 26,
                    }}
                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                    className='absolute w-6 h-6 bg-white rounded-full shadow-md top-1 left-0'
                  />
                </button>
              </div>

              {!settings.hideVideo && !settings.hideWebcam && (
                <div className='p-4 border rounded-lg bg-gray-50'>
                  <div className='flex items-center justify-between mb-3'>
                    <h3 className='font-semibold text-gray-800'>화면 비율</h3>
                    <span className='text-sm font-medium text-blue-600'>
                      {settings.videoSize}% : {100 - settings.videoSize}%
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <p className='mb-4 text-sm text-gray-500'>
                      운동 영상과 웹캠의 화면 비율을 조정합니다
                    </p>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={handleResetVideoSize}
                      className='mb-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                    >
                      <FiRefreshCw className='w-4 h-4' />
                    </Button>
                  </div>
                  <div className='flex items-center gap-3'>
                    <input
                      type='range'
                      min='20'
                      max='80'
                      value={settings.videoSize}
                      onChange={(e) =>
                        handleVideoSizeChange(Number(e.target.value))
                      }
                      className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3A6BFC]'
                    />
                  </div>
                  <div className='flex justify-between mt-2 text-xs text-gray-500'>
                    <span>영상 작게</span>
                    <span>영상 크게</span>
                  </div>
                </div>
              )}
            </div>

            <div className='mt-8'>
              <Button
                onClick={onClose}
                className='w-full h-12 text-base font-semibold'
                size='lg'
              >
                확인
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

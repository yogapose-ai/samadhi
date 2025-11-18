"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FiMonitor } from "react-icons/fi";
import { toast } from "sonner";
import { useVideoStore } from "@/store/videoStore";
import { Button } from "@/components/ui/button";

interface StepScreenShareProps {
  onComplete: (isSelected: boolean) => void;
  isSelected: boolean;
}

export function StepScreenShare({
  onComplete,
  isSelected,
}: StepScreenShareProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { startScreenShare } = useVideoStore();

  const handleScreenShare = async () => {
    setIsLoading(true);
    try {
      await startScreenShare();
      onComplete(true);
      toast.success("화면 공유가 시작되었습니다.");
    } catch {
      // console.error("화면 공유 실패:", error);
      toast.error("화면 공유를 시작하지 못했습니다. 권한을 확인해주세요.");
      onComplete(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='flex flex-col items-center justify-center w-full max-w-2xl mx-auto'
    >
      <h2 className='mb-4 text-3xl font-bold text-gray-800'>
        화면 공유로 시작하기
      </h2>
      <p className='mb-8 text-gray-600'>
        유튜브 영상을 화면 공유로 함께 운동하세요
      </p>

      <div className='w-full p-8 bg-white border-2 border-gray-200 shadow-lg rounded-xl'>
        <div className='mb-6 text-center'>
          <div className='inline-flex items-center justify-center w-20 h-20 mb-4 bg-blue-100 rounded-full'>
            <FiMonitor className='w-10 h-10 text-blue-600' />
          </div>
          <h3 className='mb-2 text-xl font-semibold'>실시간 화면 공유</h3>
          <p className='text-sm text-gray-500'>
            유튜브 탭을 선택 후 공유하세요
          </p>
        </div>

        <Button
          className='w-full h-14 text-base font-semibold'
          onClick={handleScreenShare}
          disabled={isLoading || isSelected}
        >
          {isLoading ? (
            "스트림 준비 중..."
          ) : isSelected ? (
            "화면 공유 활성화됨"
          ) : (
            <>
              <FiMonitor className='w-5 h-5 mr-2' />
              화면 공유 시작
            </>
          )}
        </Button>

        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className='mt-4 p-4 bg-green-50 border border-green-200 rounded-lg'
          >
            <p className='text-sm font-medium text-green-800'>
              화면 공유가 활성화되었습니다. 다음 단계를 진행해주세요.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

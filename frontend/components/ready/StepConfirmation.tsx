"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FiArrowRight, FiCheck, FiX } from "react-icons/fi";
import { Button } from "@/components/ui/button";

interface PreparationItemProps {
  label: string;
  isReady: boolean;
  readyText?: string;
}

const PreparationItem = ({
  label,
  isReady,
  readyText,
}: PreparationItemProps) => (
  <motion.div
    className={`flex items-center p-4 rounded-lg border transition-colors duration-300 ${
      isReady ? "bg-green-50 border-green-300" : "bg-gray-100 border-gray-300"
    }`}
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
  >
    <div
      className={`flex items-center justify-center w-6 h-6 rounded-full mr-3 ${
        isReady ? "bg-green-600" : "bg-gray-500"
      }`}
    >
      {isReady ? (
        <FiCheck className='w-4 h-4 text-white' strokeWidth={2.5} />
      ) : (
        <FiX className='w-4 h-4 text-white' strokeWidth={2.5} />
      )}
    </div>
    <span
      className={`flex-1 text-base font-medium ${
        isReady ? "text-gray-900" : "text-gray-700"
      }`}
    >
      {label}
    </span>
    {isReady && readyText && (
      <span className='ml-4 text-base font-semibold text-green-700 truncate max-w-[150px]'>
        {readyText}
      </span>
    )}
  </motion.div>
);

interface StepConfirmationProps {
  workoutSelected: boolean;
  workoutTitle: string;
  webcamActive: boolean;
  workoutType: "screen" | "sample" | null;
  workoutPath: string;
}

export function StepConfirmation({
  workoutSelected,
  workoutTitle,
  webcamActive,
  workoutType,
  workoutPath,
}: StepConfirmationProps) {
  const isReadyToProceed = workoutSelected && webcamActive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='flex flex-col items-center justify-center w-full max-w-xl mx-auto'
    >
      <h2 className='mb-3 text-4xl font-extrabold text-gray-900'>
        🙌 최종 준비 확인
      </h2>
      <p className='mb-10 text-lg text-gray-600'>
        모든 설정 항목이 완료되었는지 확인해주세요.
      </p>

      <div className='w-full p-8 bg-white border border-gray-200 rounded-2xl shadow-xl'>
        <h3 className='mb-6 text-2xl font-bold text-gray-800'>
          운동 시작 전 체크리스트
        </h3>

        <div className='space-y-4 mb-8'>
          <PreparationItem
            label='1. 운동 영상 선택 완료'
            isReady={workoutSelected}
            readyText={workoutSelected ? workoutTitle : "필수"}
          />
          <PreparationItem
            label='2. 웹캠 연결 완료'
            isReady={webcamActive}
            readyText={webcamActive ? "활성화됨" : "필수"}
          />
        </div>

        <Link
          href={
            isReadyToProceed
              ? `/workout?type=${workoutType}&path=${workoutPath}`
              : "#"
          }
          className='block mx-auto max-w-sm'
        >
          <Button
            asChild
            className={`w-full h-12 text-base font-semibold transition-all duration-300 ${
              !isReadyToProceed
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#3A6BFC] hover:bg-blue-600 hover:scale-[1.01] active:scale-[0.99]"
            }`}
            disabled={!isReadyToProceed}
          >
            {isReadyToProceed ? (
              <span className='flex items-center'>
                💪 운동 시작하기
                <FiArrowRight className='w-5 h-5 ml-2' />
              </span>
            ) : (
              "👆 준비를 완료해주세요"
            )}
          </Button>
        </Link>

        {!isReadyToProceed && (
          <p className='mt-4 text-sm text-center text-red-600 font-medium'>
            모든 항목을 완료해야 운동을 시작할 수 있습니다.
          </p>
        )}
      </div>
    </motion.div>
  );
}

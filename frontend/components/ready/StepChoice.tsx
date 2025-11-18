"use client";

import { motion } from "framer-motion";
import { FiMonitor, FiVideo } from "react-icons/fi";
import { Button } from "@/components/ui/button";

interface StepChoiceProps {
  onSelectType: (type: "screen" | "sample") => void;
}

export function StepChoice({ onSelectType }: StepChoiceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='flex flex-col items-center justify-center w-full max-w-2xl mx-auto mt-30'
    >
      <h2 className='mb-4 text-3xl font-bold text-gray-800'>운동 방식 선택</h2>
      <p className='mb-12 text-gray-600'>어떤 방식으로 운동하시겠어요?</p>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 w-full'>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectType("screen")}
          className='p-8 bg-white border-2 border-gray-200 shadow-lg cursor-pointer rounded-xl hover:border-blue-400 hover:shadow-xl transition-all'
        >
          <div className='flex flex-col items-center text-center'>
            <div className='inline-flex items-center justify-center w-20 h-20 mb-4 bg-blue-100 rounded-full'>
              <FiMonitor className='w-10 h-10 text-blue-600' />
            </div>
            <h3 className='mb-2 text-xl font-semibold'>화면 공유</h3>
            <p className='mb-4 text-sm text-gray-600'>
              유튜브 영상을 공유하며 운동하세요
            </p>
            <Button className='w-full'>선택하기</Button>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectType("sample")}
          className='p-8 bg-white border-2 border-gray-200 shadow-lg cursor-pointer rounded-xl hover:border-purple-400 hover:shadow-xl transition-all'
        >
          <div className='flex flex-col items-center text-center'>
            <div className='inline-flex items-center justify-center w-20 h-20 mb-4 bg-purple-100 rounded-full'>
              <FiVideo className='w-10 h-10 text-purple-600' />
            </div>
            <h3 className='mb-2 text-xl font-semibold'>샘플 영상</h3>
            <p className='mb-4 text-sm text-gray-600'>
              추천 운동 영상을 선택하세요
            </p>
            <Button className='w-full'>선택하기</Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

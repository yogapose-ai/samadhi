"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";

interface SampleVideo {
  id: number;
  title: string;
  path: string;
  thumbPath: string;
  duration: number;
}

interface StepSampleVideoProps {
  onComplete: (video: { title: string; path: string } | null) => void;
}

export function StepSampleVideo({ onComplete }: StepSampleVideoProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [videos, setVideos] = useState<SampleVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        const response = await api.get<{
          success: boolean;
          message: SampleVideo[];
        }>("/api/video");

        if (response.data && response.data.success) {
          setVideos(response.data.message);
        } else {
          setError("샘플 영상을 불러오는데 실패했습니다.");
        }
      } catch (err) {
        console.error("Error fetching videos:", err);
        setError("영상을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const handleCardClick = (index: number) => {
    setSelectedIndex(index);
    const video = videos[index];
    if (video) {
      onComplete({ title: video.title, path: video.path });
    }
  };

  if (isLoading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <p className='text-gray-600'>샘플 영상을 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex justify-center items-center h-64'>
        <p className='text-red-500'>{error}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='flex flex-col items-center justify-center w-full mx-auto'
    >
      <h2 className='mb-4 text-3xl font-bold text-gray-800'>
        샘플 영상 선택하기
      </h2>
      <p className='mb-8 text-gray-600'>
        <span className='text-[#3A6BFC] font-semibold'>Samadhi</span>가 추천하는
        운동을 만나보세요
      </p>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {videos.map((video, index) => (
          <motion.div
            key={video.id} // key는 index보다 고유한 id를 사용하는 것이 좋습니다.
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleCardClick(index)}
            className={`group cursor-pointer p-4 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl ${
              selectedIndex === index
                ? "border-2 border-[#3A6BFC] bg-white"
                : "border border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className='relative mb-3 overflow-hidden rounded-lg h-48'>
              <img
                className='object-cover object-center w-full h-full transition-transform duration-300 group-hover:scale-105'
                src={video.thumbPath}
                alt={video.title}
              />
              <div className='absolute top-2 right-2 px-2 py-1 text-xs font-semibold text-white bg-black/70 rounded'>
                {`${video.duration}분`}
              </div>
            </div>

            <div className='flex flex-col'>
              <p className='mb-3 text-lg font-semibold leading-tight text-gray-800 line-clamp-2'>
                {video.title}
              </p>

              <Button
                variant={selectedIndex === index ? "primary" : "outline"}
                className='w-full h-9 text-sm'
              >
                {selectedIndex === index ? "✓ 선택됨" : "선택하기"}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

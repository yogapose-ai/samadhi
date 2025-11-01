"use client";

import Image from "next/image";
import { FiArrowRight } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className='flex flex-col min-h-screen'>
      <div className='grid flex-1 grid-cols-1 lg:grid-cols-2'>
        <div className='relative bg-[#3A6BFC] overflow-hidden min-h-[50vh] lg:min-h-[103vh]'>
          <Image
            src='/images/home-left-bg.svg'
            alt='Person doing a handstand yoga pose'
            fill
            style={{ objectFit: "cover" }}
            className='object-cover object-bottom'
            priority
            sizes='(max-width: 1024px) 100vw, 50vw'
          />
        </div>

        <div className='relative overflow-hidden min-h-[50vh] lg:min-h-full'>
          <Image
            src='/images/home-right-bg.svg'
            alt='Yoga background abstract'
            fill
            style={{ objectFit: "cover" }}
          />

          <motion.div className='relative z-10 flex flex-col items-start justify-center min-h-full p-16'>
            <motion.h1
              className='text-8xl font-light leading-[105%] tracking-[-0.02em] text-[#3A6BFC] mb-2'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Samadhi,
            </motion.h1>
            <motion.h2
              className='text-[65px] font-light leading-[98%] tracking-[-0.01em] opacity-40'
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #3A6BFC 0%, #19AFFF 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Personal Yoga
              <br />
              Care Partner
            </motion.h2>

            <motion.div
              className='h-20'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1, delay: 0.6 }}
            ></motion.div>

            <motion.p
              className='text-base font-normal leading-[150%] text-gray-500 max-w-md mb-20'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              Samadhi는 MediaPipe 기반의 정교한 관절 추적 기술을 활용합니다.
              실시간으로 자세 데이터를 분석하고, 전문적인 유사도 지표를 제공하여
              당신의 움직임 정확도를 한층 높이는 서비스입니다.
              <br />
              당신의 운동 여정을 새롭게 시작하세요.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              <Button
                variant='primary_ring'
                size='xl'
                shape='full'
                className='text-base font-base'
                onClick={() => {
                  router.push("/ready");
                }}
              >
                운동 시작하기
                <FiArrowRight className='w-4 h-4 ml-1' />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

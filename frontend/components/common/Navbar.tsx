"use client";

import Image from "next/image";
import Link from "next/link";
import useAuthStore from "@/store/authStore";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { isLoggedIn, nickname } = useAuthStore();

  return (
    <nav className='flex items-center justify-between px-20 py-4 bg-white border-b border-gray-100'>
      <Link
        href='/home'
        className='cursor-pointer transition-opacity hover:opacity-80'
      >
        <Image src='/images/logo.svg' alt='Samadhi' width={155} height={50} />
      </Link>

      <div className='flex items-center space-x-2'>
        <Link href='/home'>
          <Button
            variant='ghost'
            className='text-base font-medium h-10 px-4 hover:bg-gray-50 transition-colors'
          >
            Home
          </Button>
        </Link>
        <Link href='/record'>
          <Button
            variant='ghost'
            className='text-base font-medium h-10 px-4 hover:bg-gray-50 transition-colors'
          >
            My Record
          </Button>
        </Link>
      </div>

      <div className='flex items-center space-x-3'>
        {isLoggedIn ? (
          <div className='text-base font-medium text-gray-700 px-4'>
            {nickname}님 환영해요!
          </div>
        ) : (
          <>
            <Link href='/auth/login'>
              <Button
                variant='ghost'
                className='text-base font-medium h-10 px-4 hover:bg-gray-50 transition-colors'
              >
                로그인
              </Button>
            </Link>
            <Link href='/auth/signup'>
              <Button
                variant='ghost'
                className='text-base font-medium h-10 px-4 border-gray-300 hover:bg-gray-50 transition-colors'
              >
                회원가입
              </Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

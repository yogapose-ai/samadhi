"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import useAuthStore from "@/store/authStore";

export default function Navbar() {
  const router = useRouter();
  const { isLoggedIn, logout, nickname } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/home");
  };

  return (
    <nav className="flex items-center justify-between px-20 py-4">
      <Link href="/home" className="cursor-pointer">
        <Image src="/images/logo.svg" alt="Samadhi" width={155} height={50} />
      </Link>
      <div className="flex items-center space-x-6">
        <Link href="/record">
          <button className="bg-[#3A6BFC] hover:bg-[#2a53d4] text-white text-base font-normal px-5 py-2 rounded-full transition-all duration-200 shadow-sm">
            운동기록 조회
          </button>
        </Link>
        {isLoggedIn ? (
          <div className="text-base font-normal">{nickname}님 환영해요!</div>
        ) : (
          <>
            <Link href="/auth/login">
              <Button variant="ghost" className="text-base font-normal h-9">
                로그인
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="ghost" className="text-base font-normal h-9">
                회원가입
              </Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/axios";
import useAuthStore from "@/store/authStore";
import AuthModal from "@/components/common/AuthModal";
import { Button, Input, Label } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [id, setId] = useState("");
  const [pwd, setPwd] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const response = await api.post("/auth/login", { id, pwd });
      const nickname = response.data.message;
      login(nickname);
      toast.success("로그인에 성공했습니다.");
      router.push("/home");
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.");
    }
  };

  return (
    <AuthModal title='로그인'>
      <form onSubmit={handleSubmit} className='space-y-6'>
        <div className='grid gap-2'>
          <Label htmlFor='id'>아이디</Label>
          <Input
            id='id'
            type='text'
            value={id}
            onChange={(e) => setId(e.target.value)}
            required
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='pwd'>비밀번호</Label>
          <Input
            id='pwd'
            type='password'
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            required
          />
        </div>
        <Button
          variant='primary'
          size='xl'
          className='w-full mt-4!'
          type='submit'
        >
          로그인
        </Button>
        <div className='mt-1 text-sm text-center text-gray-600'>
          계정이 없으신가요?{" "}
          <Link
            href='/auth/signup'
            className='font-semibold text-blue-600 hover:underline'
          >
            회원가입
          </Link>
        </div>
      </form>
    </AuthModal>
  );
}

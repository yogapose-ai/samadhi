"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/axios";
import AuthModal from "@/components/common/AuthModal";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    id: "",
    pwd: "",
    nickname: "",
    gender: "",
    birth: "",
    height: "",
    weight: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleSelectChange = (value: string) => {
    setFormData({ ...formData, gender: value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      data.append(key, formData[key as keyof typeof formData]);
    });
    data.append("profile", new Blob([]), "");

    try {
      await api.post("/auth/sign-up", data);
      toast.success("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");
      router.push("/auth/login");
    } catch (error) {
      console.error("Signup failed:", error);
      toast.error("회원가입에 실패했습니다. 입력 정보를 확인해주세요.");
    }
  };

  return (
    <AuthModal title='회원가입'>
      <form onSubmit={handleSubmit} className='space-y-5'>
        <div className='space-y-4'>
          <div className='grid gap-2'>
            <Label htmlFor='id'>아이디</Label>
            <Input
              id='id'
              type='text'
              value={formData.id}
              onChange={handleChange}
              required
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='pwd'>비밀번호</Label>
            <Input
              id='pwd'
              type='password'
              value={formData.pwd}
              onChange={handleChange}
              required
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='nickname'>닉네임</Label>
            <Input
              id='nickname'
              type='text'
              value={formData.nickname}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='gender'>
                성별 <span className='text-gray-500'>(선택)</span>
              </Label>
              <Select onValueChange={handleSelectChange}>
                <SelectTrigger id='gender'>
                  <SelectValue placeholder='성별 선택' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='m'>남성</SelectItem>
                  <SelectItem value='f'>여성</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='birth'>
                생년월일 <span className='text-gray-500'>(선택)</span>
              </Label>
              <Input
                id='birth'
                type='date'
                value={formData.birth}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='height'>
                키 (cm) <span className='text-gray-500'>(선택)</span>
              </Label>
              <Input
                id='height'
                type='number'
                step='0.1'
                value={formData.height}
                onChange={handleChange}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='weight'>
                몸무게 (kg) <span className='text-gray-500'>(선택)</span>
              </Label>
              <Input
                id='weight'
                type='number'
                step='0.1'
                value={formData.weight}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <Button
          variant='primary'
          size='xl'
          className='w-full mt-6!'
          type='submit'
        >
          가입하기
        </Button>
        <div className='mt-1 text-sm text-center text-gray-600'>
          이미 계정이 있으신가요?{" "}
          <Link
            href='/auth/login'
            className='font-semibold text-blue-600 hover:underline'
          >
            로그인
          </Link>
        </div>
      </form>
    </AuthModal>
  );
}

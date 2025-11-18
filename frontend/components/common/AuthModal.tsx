import React from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthModalProps {
  title: string;
  children: React.ReactNode;
}

const AuthModal = ({ title, children }: AuthModalProps) => {
  return (
    <div className='relative flex flex-col items-center justify-center min-h-screen overflow-hidden'>
      <Image
        src='/images/home-right-bg.svg'
        alt='Yoga background abstract'
        fill
        style={{ objectFit: "cover" }}
        className='-z-10'
      />
      <div className='w-full max-w-md mx-auto'>
        <Card className='p-6 bg-white/80 backdrop-blur-sm'>
          <CardHeader className='items-center p-0 mb-6'>
            <Image
              src='/images/logo-small.svg'
              alt='Samadhi Logo'
              width={48}
              height={48}
            />
            <CardTitle className='mt-4 text-2xl font-semibold text-center text-gray-800'>
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className='p-0'>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthModal;

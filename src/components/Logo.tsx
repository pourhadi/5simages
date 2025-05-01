import React from 'react';
import Image from 'next/image';
import logoSrc from '../../logo.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <Image src={logoSrc} alt="StillMotion Logo" width={40} height={40} />
      <div className="flex flex-col">
        <span className="text-2xl font-extrabold text-white">
          Still<span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">Motion</span>
        </span>
        {/*<span className="text-sm text-[#3EFFE2]">stillmotion.ai</span>*/}
      </div>
    </div>
  );
}
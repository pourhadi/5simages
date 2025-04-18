import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex items-center">
        {/* Text Section */}
        <div className="flex flex-col">
          <span className="text-2xl font-bold leading-none text-white">First<span className="text-gradient">Frame</span></span>
          <span className="text-sm text-[#F2EFE8]">firstframe.app</span>
        </div>
      </div>
    </div>
  );
} 
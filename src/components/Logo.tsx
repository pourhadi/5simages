import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  // Size mapping
  const sizes = {
    sm: { height: 40 },
    md: { height: 54 },
    lg: { height: 67 },
  };
  
  const { height } = sizes[size];
  
  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex items-center">
        {/* Orange Filmstrip Icon with Play Button */}
        <div className="relative mr-2">
          <svg width={height * 0.8} height={height * 0.8} viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="12" y="8" width="72" height="80" rx="8" fill="#FF7733" />
            <rect x="12" y="8" width="10" height="10" rx="2" fill="#1a202c" />
            <rect x="12" y="26" width="10" height="10" rx="2" fill="#1a202c" />
            <rect x="12" y="44" width="10" height="10" rx="2" fill="#1a202c" />
            <rect x="12" y="62" width="10" height="10" rx="2" fill="#1a202c" />
            <rect x="74" y="8" width="10" height="10" rx="2" fill="#1a202c" />
            <rect x="74" y="26" width="10" height="10" rx="2" fill="#1a202c" />
            <rect x="74" y="44" width="10" height="10" rx="2" fill="#1a202c" />
            <rect x="74" y="62" width="10" height="10" rx="2" fill="#1a202c" />
            <polygon points="36,30 36,66 68,48" fill="#F2EFE8" />
          </svg>
        </div>
        
        {/* Text Section */}
        <div className="flex flex-col">
          <span className="text-2xl font-bold leading-none text-white">5s<span className="text-[#FF7733]">Images</span></span>
          <span className="text-sm text-[#F2EFE8]">5simages.ai</span>
        </div>
      </div>
    </div>
  );
} 
import React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'full' | 'icon-only' | 'text-only';
}

const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md', 
  showText = true,
  variant = 'full'
}) => {
  const sizeClasses = {
    sm: { logo: 'h-8 w-auto', text: 'text-lg' },
    md: { logo: 'h-10 w-auto', text: 'text-xl' },
    lg: { logo: 'h-12 w-auto', text: 'text-2xl' },
    xl: { logo: 'h-16 w-auto', text: 'text-3xl' }
  };

  const iconSizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  if (variant === 'icon-only') {
    return (
      <div className={`flex items-center ${className}`}>
        <div className={`${iconSizeClasses[size]} bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-lg`}>
          <svg width="60%" height="60%" viewBox="0 0 32 32" fill="none">
            <g transform="translate(10, 10)">
              <circle cx="6" cy="6" r="4.5" fill="white" opacity="0.9"/>
              <path d="M6 1L7 2.5L6 4L5 2.5Z" fill="white" opacity="0.8"/>
              <path d="M11 6L9.5 7L8 6L9.5 5Z" fill="white" opacity="0.8"/>
              <path d="M6 11L5 9.5L6 8L7 9.5Z" fill="white" opacity="0.8"/>
              <path d="M1 6L2.5 5L4 6L2.5 7Z" fill="white" opacity="0.8"/>
              <circle cx="6" cy="6" r="1.8" fill="url(#gradient1)"/>
            </g>
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#3B82F6', stopOpacity:1}} />
                <stop offset="100%" style={{stopColor:'#1E40AF', stopOpacity:1}} />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    );
  }

  if (variant === 'text-only') {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="flex flex-col">
          <span className={`font-bold ${sizeClasses[size].text} bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent`}>
            SpareFlow
          </span>
          <span className="text-xs text-gray-500 -mt-1">AI Logistics Platform</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <Image
        src="/logo.svg"
        alt="SpareFlow Logo"
        width={200}
        height={60}
        className={sizeClasses[size].logo}
        priority
      />
    </div>
  );
};

export default Logo;
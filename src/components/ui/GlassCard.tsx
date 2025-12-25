import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard = ({ children, className }: GlassCardProps) => {
  return (
    <div
      className={cn(
        "bg-white/70 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-2xl transition duration-500 border border-white/80",
        className
      )}
    >
      {children}
    </div>
  );
};

import React from 'react';
import { cn } from '../../lib/utils';

interface AccentButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const AccentButton = ({ children, className, disabled, ...props }: AccentButtonProps) => {
  return (
    <button
      disabled={disabled}
      className={cn(
        "flex items-center justify-center space-x-2 px-6 py-3 font-semibold rounded-xl text-white transition duration-200",
        disabled
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-[#F97316] hover:bg-opacity-90 shadow-xl shadow-[#F973161a]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  const borderWidths = {
    sm: 'border-[1.5px]',
    md: 'border-2',
    lg: 'border-[3px]',
  };

  return (
    <div
      className={`${sizes[size]} ${borderWidths[size]} rounded-full animate-spin ${className}`}
      style={{
        borderColor: 'rgba(99, 102, 241, 0.2)',
        borderTopColor: '#6366f1',
      }}
    />
  );
}

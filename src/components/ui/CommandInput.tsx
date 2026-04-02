'use client';

import { useState, useRef, useCallback } from 'react';

interface CommandInputProps {
  onSubmit: (command: string) => void;
  disabled?: boolean;
}

export default function CommandInput({ onSubmit, disabled }: CommandInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSubmit(value.trim());
    setValue('');
  }, [value, disabled, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Type a command: 'walk forward', 'wave hello'..."
          disabled={disabled}
          className="w-full h-12 px-4 pr-10 rounded-xl bg-bg-card border border-border text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all text-sm"
        />
        {disabled && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-text-secondary border-t-accent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="h-12 px-6 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-all flex items-center gap-2"
      >
        <span>Send</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
        </svg>
      </button>
    </form>
  );
}

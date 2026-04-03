'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface AvatarSelectorProps {
  onAvatarReady: (glbUrl: string) => void;
  currentGlbUrl?: string;
}

export default function AvatarSelector({ onAvatarReady, currentGlbUrl }: AvatarSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (!event.data || event.data.source !== 'readyplayerme') return;

    if (event.data.eventName === 'v1.avatar.completed') {
      const { url } = event.data.data as { url: string };
      setIsCreating(false);
      onAvatarReady(url);
    }

    if (event.data.eventName === 'v1.iframe.loading-failed') {
      setIsCreating(false);
      setIsLoading(false);
      alert('Avatar creator failed to load. Please try again.');

    }
  }, [onAvatarReady]);

  useEffect(() => {
    if (!isCreating) return;
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isCreating, handleMessage]);

  return (
    <div className="flex flex-col gap-3">
      {!isCreating ? (
        <>
          {currentGlbUrl ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#a855f7]/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <span className="text-sm text-[#9ca3af]">Avatar loaded</span>
              <button
                onClick={() => setIsCreating(true)}
                className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-[#1a1a28] border border-[#2a2a3a] text-[#d1d5db] hover:border-[#a855f7]/50 transition-colors"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full h-12 rounded-xl bg-[#a855f7]/20 border border-[#a855f7]/30 text-[#a855f7] hover:bg-[#a855f7]/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Create Avatar
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Customize Avatar</span>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs text-[#6b7280] hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
          <div className="relative h-[600px] rounded-xl overflow-hidden border border-[#2a2a3a]">
            <iframe
              ref={iframeRef}
              src="https://readyplayer.me/avatar?frameApi=1"
              allow="camera *; microphone *"
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
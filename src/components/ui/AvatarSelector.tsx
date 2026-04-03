'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Ready Player Me embed URLs (free, no auth required)
const RPM_URL = 'https://readyplayer.me/avatar?frameApi=1';
// Fallback: older URL that redirects to current creator
const RPM_FALLBACK_URL = 'https://readyplayer.me';

interface AvatarSelectorProps {
  onAvatarReady: (glbUrl: string) => void;
  currentGlbUrl?: string;
}

export default function AvatarSelector({ onAvatarReady, currentGlbUrl }: AvatarSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (!event.data || event.data.source !== 'readyplayerme') return;

    if (event.data.eventName === 'v1.avatar.completed') {
      const { url } = event.data.data as { url: string };
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsCreating(false);
      setLoadError(null);
      onAvatarReady(url);
    }

    if (event.data.eventName === 'v1.iframe.loading-failed') {
      setLoadError('Avatar creator failed to load. Please check your connection and try again.');
    }
  }, [onAvatarReady]);

  // Detect iframe load timeout (indicates RPM is down or blocked)
  useEffect(() => {
    if (!isCreating) return;

    timeoutRef.current = setTimeout(() => {
      setLoadError('Avatar creator is taking too long to load. Ready Player Me may be temporarily unavailable.');
    }, 15000);

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isCreating, handleMessage]);

  // Reset error state when closing
  useEffect(() => {
    if (!isCreating) setLoadError(null);
  }, [isCreating]);

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
          <div className="relative h-[600px] rounded-xl overflow-hidden border border-[#2a2a3a] bg-[#0a0a14]">
            <iframe
              ref={iframeRef}
              src={RPM_URL}
              allow="camera *; microphone *"
              className="w-full h-full"
              title="Ready Player Me Avatar Creator"
            />
            {loadError && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a14]/90">
                <div className="text-center p-6 max-w-xs">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" className="mx-auto mb-3">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  <p className="text-sm text-[#9ca3af] mb-3">{loadError}</p>
                  <p className="text-xs text-[#4b5563]">
                    Ready Player Me may be temporarily unavailable.
                    Try again in a moment, or check{' '}
                    <a
                      href="https://readyplayer.me"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#a855f7] underline"
                    >
                      readyplayer.me
                    </a>
                    {' '}directly.
                  </p>
                </div>
              </div>
            )}
            {!loadError && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <div className="px-3 py-1.5 rounded-lg bg-black/60 text-xs text-[#6b7280]">
                  Customize your avatar and click Done
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

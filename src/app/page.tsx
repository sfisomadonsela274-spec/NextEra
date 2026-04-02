'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { AnimationIntent } from '@/types';
import { mapCommandToAnimation, generateModelSummary } from '@/lib/openai';
import CommandInput from '@/components/ui/CommandInput';
import GenerationPanel from '@/components/ui/GenerationPanel';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Dynamically import Three.js components (no SSR)
const SceneCanvas = dynamic(() => import('@/components/three/SceneCanvas'), { ssr: false });
const Avatar = dynamic(() => import('@/components/three/Avatar'), { ssr: false });
const ProceduralModelViewer = dynamic(() => import('@/components/three/ProceduralModelViewer'), { ssr: false });
const PlaceholderModel = dynamic(() => import('@/components/three/PlaceholderModel'), { ssr: false });

// ─── Test 1: 3D Generation ────────────────────────────────────────────────────

function Test1Tab() {
  const [prompt, setPrompt] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [modelKey, setModelKey] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(async (p: string) => {
    setIsGenerating(true);
    setPrompt(p);
    setSummary(null);

    try {
      const text = await generateModelSummary(p);
      setSummary(text);
      setModelKey(k => k + 1);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full">
      {/* 3D Viewer */}
      <div className="flex-1 min-h-[300px] lg:min-h-0 rounded-2xl overflow-hidden bg-[#0a0a14] border border-[#2a2a3a]">
        <SceneCanvas className="w-full h-full min-h-[300px] lg:min-h-[420px]">
          {prompt ? (
            <ProceduralModelViewer
              key={modelKey}
              prompt={prompt}
              onDescriptionGenerated={setSummary}
            />
          ) : (
            <PlaceholderModel />
          )}
        </SceneCanvas>
      </div>

      {/* Panel */}
      <div className="lg:w-[360px] flex flex-col gap-4">
        <div className="bg-[#12121c] border border-[#2a2a3a] rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium text-[#6b7280] mb-1">Test 1</h3>
            <h2 className="text-lg font-semibold text-white">AI-Generated 3D Asset</h2>
            <p className="text-sm text-[#6b7280] mt-1">
              Describe a training object — AI generates a procedural 3D model
            </p>
          </div>

          <GenerationPanel
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            progress={0}
          />

          <div className="text-xs text-[#4b5563]">
            Try: &quot;hard hat&quot;, &quot;fire extinguisher&quot;, &quot;wrench&quot;, &quot;first aid kit&quot;, &quot;safety vest&quot;
          </div>
        </div>

        {summary && (
          <div className="bg-[#12121c] border border-[#2a2a3a] rounded-2xl p-5">
            <h3 className="text-sm font-medium text-[#a855f7] mb-2">Educational Context</h3>
            <p className="text-sm text-[#9ca3af] leading-relaxed">{summary}</p>
            <p className="text-xs text-[#4b5563] mt-2 italic">Prompt: &quot;{prompt}&quot;</p>
          </div>
        )}

        {isGenerating && (
          <div className="bg-[#12121c] border border-[#2a2a3a] rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <LoadingSpinner size="md" />
              <div>
                <p className="text-sm font-medium text-white">Generating model...</p>
                <p className="text-xs text-[#6b7280]">Creating procedural 3D asset</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Test 2: Avatar Animation ──────────────────────────────────────────────────

function Test2Tab() {
  const [animation, setAnimation] = useState<AnimationIntent['animation']>('idle');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [log, setLog] = useState<Array<{ cmd: string; anim: string; time: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCommand = useCallback(async (cmd: string) => {
    setIsProcessing(true);
    try {
      const result = await mapCommandToAnimation(cmd);
      if (result.intent) {
        setAnimation(result.intent.animation);
        setExplanation(result.intent.explanation);
        setLog(prev => [
          {
            cmd,
            anim: result.intent!.animation,
            time: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 9),
        ]);
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full">
      {/* Avatar Viewer */}
      <div className="flex-1 min-h-[300px] lg:min-h-0 rounded-2xl overflow-hidden bg-[#0a0a14] border border-[#2a2a3a]">
        <SceneCanvas className="w-full h-full min-h-[300px] lg:min-h-[420px]">
          <Avatar animation={animation} />
        </SceneCanvas>
      </div>

      {/* Command Panel */}
      <div className="lg:w-[360px] flex flex-col gap-4">
        <div className="bg-[#12121c] border border-[#2a2a3a] rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium text-[#6b7280] mb-1">Test 2</h3>
            <h2 className="text-lg font-semibold text-white">Natural Language Avatar</h2>
            <p className="text-sm text-[#6b7280] mt-1">
              Type a command to trigger an avatar animation
            </p>
          </div>

          <CommandInput onSubmit={handleCommand} disabled={isProcessing} />

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a1a28] border border-[#2a2a3a]">
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-sm font-medium text-white capitalize">Current: {animation}</span>
          </div>
        </div>

        {explanation && (
          <div className="bg-[#12121c] border border-[#2a2a3a] rounded-2xl p-5">
            <h3 className="text-sm font-medium text-[#a855f7] mb-2">Animation Context</h3>
            <p className="text-sm text-[#9ca3af] leading-relaxed">{explanation}</p>
          </div>
        )}

        {/* Command log */}
        <div className="bg-[#12121c] border border-[#2a2a3a] rounded-2xl p-5 flex-1">
          <h3 className="text-sm font-medium text-[#6b7280] mb-3">Command Log</h3>
          {log.length === 0 ? (
            <p className="text-sm text-[#4b5563] italic">No commands yet. Try &quot;wave hello&quot; or &quot;walk forward&quot;</p>
          ) : (
            <div className="flex flex-col gap-2">
              {log.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-[#2a2a3a] last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#4b5563]">{entry.time}</span>
                    <span className="text-sm text-[#d1d5db]">&quot;{entry.cmd}&quot;</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#a855f7]/10 text-[#a855f7] font-medium">
                    {entry.anim}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick commands */}
        <div className="bg-[#12121c] border border-[#2a2a3a] rounded-2xl p-5">
          <h3 className="text-sm font-medium text-[#6b7280] mb-3">Quick Commands</h3>
          <div className="flex flex-wrap gap-2">
            {(['wave hello', 'walk forward', 'point at target', 'crouch down', 'stop'] as const).map(cmd => (
              <button
                key={cmd}
                onClick={() => handleCommand(cmd)}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg bg-[#1a1a28] border border-[#2a2a3a] text-xs text-[#d1d5db] hover:border-[#a855f7]/50 transition-colors disabled:opacity-40"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root Page ────────────────────────────────────────────────────────────────

type Tab = 'test1' | 'test2';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('test1');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#08080f' }}>
      {/* Header */}
      <header className="border-b border-[#2a2a3a] bg-[#0a0a14]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#a855f7] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">NexEra</span>
            <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-[#a855f7]/10 text-[#a855f7] font-medium">
              AI Training Platform
            </span>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 bg-[#12121c] rounded-xl p-1">
            {[
              { id: 'test1' as Tab, label: '3D Generation' },
              { id: 'test2' as Tab, label: 'Avatar Animation' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${activeTab === tab.id
                    ? 'bg-[#a855f7] text-white'
                    : 'text-[#6b7280] hover:text-white hover:bg-[#1a1a28]'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {activeTab === 'test1' ? <Test1Tab /> : <Test2Tab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a2a3a] py-4 px-4 sm:px-6 text-center">
        <p className="text-xs text-[#4b5563]">
          NexEra Platform — AI-Powered 3D Training Assets &amp; Avatar Animation
        </p>
      </footer>
    </div>
  );
}

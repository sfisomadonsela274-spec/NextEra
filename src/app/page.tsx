'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { AnimationIntent } from '@/types';
import { mapCommandToAnimation, generateViaAPI } from '@/lib/openai';
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
  const [progress, setProgress] = useState(0);
  const [generatedGroup, setGeneratedGroup] = useState<object | null>(null);

  const handleGenerate = useCallback(async (p: string, imageUrl?: string) => {
    setIsGenerating(true);
    setPrompt(p);
    setSummary(null);
    setProgress(0);
    setGeneratedGroup(null);

    try {
      const result = await generateViaAPI(p, imageUrl, undefined, setProgress);
      setSummary(result.summary);
      setGeneratedGroup((result.model as any).geometry ?? null);
      setModelKey(k => k + 1);
    } finally {
      setIsGenerating(false);
      setProgress(100);
    }
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full">
      {/* 3D Viewer */}
      <div className="flex-1 min-h-[300px] lg:min-h-0 rounded-2xl overflow-hidden glass border-white/20">
        <div className="w-full h-full min-h-[300px] lg:min-h-[420px] bg-gradient-to-br from-slate-900/5 to-slate-900/20 rounded-2xl overflow-hidden">
          <SceneCanvas className="w-full h-full min-h-[300px] lg:min-h-[420px]">
            {prompt ? (
              <ProceduralModelViewer
                key={modelKey}
                prompt={prompt}
                onModelGenerated={async (data) => {
                  setGeneratedGroup((data as any).geometry ?? null);
                }}
                onDescriptionGenerated={setSummary}
              />
            ) : (
              <PlaceholderModel />
            )}
          </SceneCanvas>
        </div>
      </div>

      {/* Panel */}
      <div className="lg:w-[360px] flex flex-col gap-4">
        <div className="glass rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-1">Test 1</h3>
            <h2 className="text-lg font-semibold text-slate-800">AI-Generated 3D Asset</h2>
            <p className="text-sm text-slate-500 mt-1">
              Describe a training object — or upload an image — AI generates a procedural 3D model
            </p>
          </div>

          <GenerationPanel
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            progress={progress}
          />

          <div className="text-xs text-slate-400">
            Try: &quot;hard hat&quot;, &quot;fire extinguisher&quot;, &quot;wrench&quot;, &quot;first aid kit&quot;, &quot;safety vest&quot;
          </div>
        </div>

        {summary && (
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-medium text-violet-600 mb-2">Educational Context</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{summary}</p>
            <p className="text-xs text-slate-400 mt-2 italic">Prompt: &quot;{prompt}&quot;</p>
          </div>
        )}

        {isGenerating && (
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <LoadingSpinner size="md" />
              <div>
                <p className="text-sm font-medium text-slate-700">Generating model...</p>
                <p className="text-xs text-slate-400">Creating procedural 3D asset</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Test 2: Avatar Animation ──────────────────────────────────────────────────

const AVATAR_COMMANDS = [
  'wave hello', 'walk forward', 'point at target', 'crouch down',
  'show correct safety posture', 'jump up', 'celebrate', 'look around',
  'pick up the object', 'open the door', 'stop',
] as const;

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
      <div className="flex-1 min-h-[300px] lg:min-h-0 rounded-2xl overflow-hidden glass border-white/20">
        <div className="w-full h-full min-h-[300px] lg:min-h-[420px] bg-gradient-to-br from-slate-900/5 to-slate-900/20 rounded-2xl overflow-hidden">
          <SceneCanvas className="w-full h-full min-h-[300px] lg:min-h-[420px]">
            <Avatar animation={animation} />
          </SceneCanvas>
        </div>
      </div>

      {/* Command Panel */}
      <div className="lg:w-[360px] flex flex-col gap-4">
        <div className="glass rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-1">Test 2</h3>
            <h2 className="text-lg font-semibold text-slate-800">Natural Language Avatar</h2>
            <p className="text-sm text-slate-500 mt-1">
              Type a command to trigger an avatar animation
            </p>
          </div>

          <CommandInput onSubmit={handleCommand} disabled={isProcessing} />

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50/80 border border-violet-200/50 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-700 capitalize">Current: {animation.replace('_', ' ')}</span>
          </div>
        </div>

        {explanation && (
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-medium text-violet-600 mb-2">Animation Context</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{explanation}</p>
          </div>
        )}

        {/* Command log */}
        <div className="glass rounded-2xl p-5 flex-1">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Command Log</h3>
          {log.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No commands yet. Try &quot;wave hello&quot; or &quot;walk forward&quot;</p>
          ) : (
            <div className="flex flex-col gap-2">
              {log.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-slate-200/50 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{entry.time}</span>
                    <span className="text-sm text-slate-700">&quot;{entry.cmd}&quot;</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 font-medium">
                    {entry.anim.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick commands */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Quick Commands</h3>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COMMANDS.map(cmd => (
              <button
                key={cmd}
                onClick={() => handleCommand(cmd)}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg bg-white/40 border border-slate-200/60 text-xs text-slate-600 hover:border-violet-300 hover:bg-violet-50/40 transition-all disabled:opacity-40 backdrop-blur-sm"
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
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf4 50%, #d8e0ef 100%)' }}>
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-pink-200/20 blur-3xl" />
      </div>

      {/* Header — glass */}
      <header className="glass border-b border-white/20 sticky top-0 z-10 backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(20px) saturate(170%)', WebkitBackdropFilter: 'blur(20px) saturate(170%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-800">NexEra</span>
            <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 font-medium">
              AI Training Platform
            </span>
          </div>

          {/* Tabs — glass */}
          <nav className="glass rounded-xl p-1">
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
                    ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-sm shadow-violet-500/25'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
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
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 relative z-10">
        {activeTab === 'test1' ? <Test1Tab /> : <Test2Tab />}
      </main>

      {/* Footer */}
      <footer className="glass border-t border-white/20 py-4 px-4 sm:px-6 text-center relative z-10">
        <p className="text-xs text-slate-500">
          NexEra Platform — AI-Powered 3D Training Assets &amp; Avatar Animation
        </p>
      </footer>
    </div>
  );
}

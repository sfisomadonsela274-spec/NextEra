'use client';

import { useState, useCallback } from 'react';

interface GenerationPanelProps {
  onGenerate: (prompt: string, imageUrl?: string) => void;
  isGenerating: boolean;
  progress?: number;
}

export default function GenerationPanel({ onGenerate, isGenerating, progress }: GenerationPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt.trim(), imageUrl.trim() || undefined);
  }, [prompt, imageUrl, isGenerating, onGenerate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setImageUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Text prompt */}
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe a training object: 'Fire extinguisher', 'Safety helmet'..."
          disabled={isGenerating}
          className="w-full h-11 px-4 rounded-xl bg-white/60 border border-slate-200/60 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/50 transition-all text-sm backdrop-blur-sm"
        />

        {/* Image dropzone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`
            relative rounded-xl border-2 border-dashed transition-all text-center py-4 px-4 cursor-pointer
            ${dragOver ? 'border-violet-400 bg-violet-50/30' : 'border-slate-200/50 hover:border-violet-300'}
            bg-white/40 backdrop-blur-sm
          `}
        >
          <input
            type="file"
            accept="image/*"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => setImageUrl(ev.target?.result as string);
                reader.readAsDataURL(file);
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isGenerating}
          />
          {imageUrl ? (
            <div className="flex items-center gap-3">
              <img src={imageUrl} alt="Uploaded" className="w-12 h-12 object-cover rounded-lg border border-slate-200/50" />
              <span className="text-sm text-slate-500">Image uploaded — drop another to replace</span>
            </div>
          ) : (
            <span className="text-sm text-slate-400">
              Drop an image here to use as reference (optional)
            </span>
          )}
        </div>

        {/* Generate button */}
        <button
          type="submit"
          disabled={!prompt.trim() || isGenerating}
          className="h-11 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 disabled:shadow-none"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generating... {progress}%</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span>Generate 3D Model</span>
            </>
          )}
        </button>

        {/* Progress bar */}
        {isGenerating && (
          <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </form>
    </div>
  );
}

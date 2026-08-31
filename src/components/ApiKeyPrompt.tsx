/**
 * ApiKeyPrompt
 * Shown when no Gemini API key is found. Lets the user paste their key.
 */
import { useState } from 'react';

interface ApiKeyPromptProps {
  onSave: (key: string) => void;
}

export function ApiKeyPrompt({ onSave }: ApiKeyPromptProps) {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) onSave(key.trim());
  };

  return (
    <div className="animate-fade-in flex flex-col items-center gap-6 px-8">
      <div className="text-center">
        <div
          className="mx-auto mb-4 h-16 w-16 rounded-2xl"
          style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
        />
        <h2 className="text-2xl font-bold">Hey, I'm Mahi 💁‍♀️</h2>
        <p className="mt-2 text-sm text-white/50">
          I need your Gemini API key to come alive. Don't worry, it stays in your browser.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Paste your API key here…"
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-mahi-accent focus:bg-white/10"
          autoFocus
        />
        <button
          type="submit"
          disabled={!key.trim()}
          className="rounded-xl bg-gradient-to-r from-mahi-accent to-mahi-accent2 px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-40 enabled:hover:opacity-90 enabled:active:scale-95"
        >
          Save & Continue
        </button>
      </form>
      <a
        href="https://aistudio.google.com/apikey"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-mahi-accent underline-offset-2 hover:underline"
      >
        Get a free API key from Google AI Studio →
      </a>
    </div>
  );
}

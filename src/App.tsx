/**
 * App
 * ===
 * The root shell. Mobile-first, fullscreen, dark futuristic.
 */

import { AmbientBackground } from './components/AmbientBackground';
import { ApiKeyPrompt } from './components/ApiKeyPrompt';
import { MicButton } from './components/MicButton';
import { StatusBar } from './components/StatusBar';
import { Toasts } from './components/Toasts';
import { Waveform } from './components/Waveform';
import { useLiveSession } from './hooks/useLiveSession';

export default function App() {
  const { state, inputLevel, outputLevel, toasts, needsApiKey, saveApiKey, toggle } =
    useLiveSession();

  const isActive = state !== 'disconnected';
  const speaking = state === 'speaking';
  const level = speaking ? outputLevel : inputLevel;

  return (
    <div className="relative flex h-[100dvh] w-full flex-col items-center justify-between overflow-hidden">
      <AmbientBackground />
      <header className="safe-top z-10 flex w-full items-center justify-center px-6 pt-8">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }} />
          <span className="text-lg font-semibold tracking-wide">
            Mahi <span className="text-white/40">AI</span>
          </span>
        </div>
      </header>
      {needsApiKey ? (
        <main className="flex flex-1 flex-col items-center justify-center">
          <ApiKeyPrompt onSave={saveApiKey} />
        </main>
      ) : (
        <main className="flex flex-1 flex-col items-center justify-center gap-8">
          <div className="relative grid place-items-center">
            <Waveform level={level} speaking={speaking} active={isActive} />
            <MicButton state={state} onClick={toggle} />
          </div>
          <StatusBar state={state} />
        </main>
      )}
      <footer className="safe-bottom z-10 flex w-full justify-center px-6 pb-10">
        <p className="text-xs text-white/30">
          {needsApiKey ? 'Powered by Gemini Live · voice only' : isActive ? 'Tap the mic to end the call' : 'Powered by Gemini Live · voice only'}
        </p>
      </footer>
      <Toasts toasts={toasts} />
    </div>
  );
}

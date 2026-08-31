/**
 * useLiveSession
 * React hook that owns the AudioStreamer + LiveSession instances.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { AudioStreamer } from '../lib/AudioStreamer';
import { LiveSession } from '../lib/LiveSession';
import { GEMINI_API_KEY } from '../lib/config';
import type { SessionState, Toast } from '../types';

export interface UseLiveSessionResult {
  state: SessionState;
  inputLevel: number;
  outputLevel: number;
  toasts: Toast[];
  errorMessage: string | null;
  needsApiKey: boolean;
  saveApiKey: (key: string) => void;
  toggle: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useLiveSession(): UseLiveSessionResult {
  const [state, setState] = useState<SessionState>('disconnected');
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [errorMessage, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(() => {
    try {
      return !!localStorage.getItem('GEMINI_API_KEY') || !!GEMINI_API_KEY;
    } catch {
      return !!GEMINI_API_KEY;
    }
  });

  const audioRef = useRef<AudioStreamer | null>(null);
  const sessionRef = useRef<LiveSession | null>(null);
  const connectingRef = useRef(false);

  const pushToast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-3), { id, text, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const saveApiKey = useCallback((key: string) => {
    try {
      localStorage.setItem('GEMINI_API_KEY', key.trim());
      setHasKey(true);
      pushToast('Key saved! Tap the mic to start ✨', 'info');
    } catch {
      setError('Could not save key');
    }
  }, [pushToast]);

  const connect = useCallback(async () => {
    if (connectingRef.current || sessionRef.current) return;
    connectingRef.current = true;
    setError(null);
    try {
      const audio = new AudioStreamer({
        onInputLevel: setInputLevel,
        onOutputLevel: setOutputLevel,
      });
      await audio.init();
      audioRef.current = audio;

      const session = new LiveSession(audio, {
        onStateChange: setState,
        onToolCall: (call) => {
          if (call.name === 'openWebsite') {
            const url = String(call.args.url ?? '');
            pushToast(`Opening ${url.replace(/^https?:\/\//, '')}…`, 'action');
          }
        },
        onToolResponse: (_id, result) => {
          if (result.startsWith('Could not')) pushToast(result, 'info');
        },
        onError: (err) => {
          setError(err.message);
          pushToast('Connection hiccup — try again', 'info');
        },
      });
      sessionRef.current = session;

      await session.connect();
      pushToast('Hey! Mahi here. Talk to me ✨', 'info');
    } catch (err) {
      setError((err as Error).message);
      setState('error');
      await audioRef.current?.destroy();
      audioRef.current = null;
      sessionRef.current = null;
    } finally {
      connectingRef.current = false;
    }
  }, [pushToast]);

  const disconnect = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    await s.disconnect();
    await audioRef.current?.destroy();
    audioRef.current = null;
    sessionRef.current = null;
    setState('disconnected');
    setInputLevel(0);
    setOutputLevel(0);
  }, []);

  const toggle = useCallback(async () => {
    if (sessionRef.current || connectingRef.current) {
      await disconnect();
    } else {
      await connect();
    }
  }, [connect, disconnect]);

  useEffect(() => {
    return () => {
      sessionRef.current?.disconnect();
      audioRef.current?.destroy();
    };
  }, []);

  return {
    state,
    inputLevel,
    outputLevel,
    toasts,
    errorMessage,
    needsApiKey: !hasKey,
    saveApiKey,
    toggle,
    connect,
    disconnect,
  };
}

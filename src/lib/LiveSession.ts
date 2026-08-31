/**
 * LiveSession
 * Thin orchestration layer over the @google/genai Live API.
 */

import {
  GoogleGenAI,
  Modality,
  Type,
  type Session,
  type LiveServerMessage,
} from '@google/genai';

import { AudioStreamer } from './AudioStreamer';
import { GEMINI_API_KEY, GEMINI_MODEL } from './config';
import { MAHI_SYSTEM_INSTRUCTION } from './systemPrompt';
import type { SessionState, ToolCall } from '../types';

export interface LiveSessionCallbacks {
  onStateChange?: (state: SessionState) => void;
  onToolCall?: (call: ToolCall) => void;
  onToolResponse?: (id: string, result: string) => void;
  onError?: (err: Error) => void;
  onTurnEnd?: () => void;
}

export class LiveSession {
  private client: GoogleGenAI | null = null;
  private session: Session | null = null;
  private readonly audio: AudioStreamer;
  private readonly cb: LiveSessionCallbacks;
  private modelSpeaking = false;
  private disposed = false;

  constructor(audio: AudioStreamer, cb: LiveSessionCallbacks = {}) {
    this.audio = audio;
    this.cb = cb;
  }

  async connect(): Promise<void> {
    if (this.session) return;

    let apiKey = GEMINI_API_KEY;
    try {
      const stored = localStorage.getItem('GEMINI_API_KEY');
      if (stored) apiKey = stored;
    } catch {}

    if (!apiKey) {
      const err = new Error('No API key found. Please enter your Gemini API key.');
      this.cb.onError?.(err);
      throw err;
    }

    this.setState('connecting');
    this.client = new GoogleGenAI({ apiKey });

    try {
      this.session = await this.client.live.connect({
        model: GEMINI_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: MAHI_SYSTEM_INSTRUCTION,
          temperature: 0.85,
          tools: [{
            functionDeclarations: [{
              name: 'openWebsite',
              description: 'Open a website in the user browser.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  url: { type: Type.STRING, description: 'The full URL to open.' },
                },
                required: ['url'],
              },
            }],
          }],
        },
        callbacks: {
          onopen: () => console.log('[LiveSession] connected'),
          onmessage: (msg: LiveServerMessage) => {
            if (!this.disposed) this.handleMessage(msg);
          },
          onerror: (e: ErrorEvent) => {
            console.error('[LiveSession] error:', e);
            if (!this.disposed) {
              this.cb.onError?.(new Error(e.message || 'Connection failed'));
              this.setState('error');
            }
          },
          onclose: (e: CloseEvent) => {
            console.log('[LiveSession] closed:', e?.reason);
            if (!this.disposed) {
              this.modelSpeaking = false;
              this.setState('disconnected');
            }
          },
        },
      });

      await this.audio.startMic((chunk) => this.sendAudioChunk(chunk));
      this.setState('listening');
    } catch (err) {
      console.error('[LiveSession] connect failed:', err);
      const error = err as Error;
      let msg = error.message || 'Connection failed';
      if (msg.includes('404') || msg.includes('not found') || msg.includes('model')) {
        msg = 'Model not available in your region. Try using a VPN set to US.';
      } else if (msg.includes('403') || msg.includes('forbidden')) {
        msg = 'API key not authorized. Check aistudio.google.com/apikey';
      } else if (msg.includes('401') || msg.includes('API key')) {
        msg = 'Invalid API key. Get one from aistudio.google.com/apikey';
      } else if (msg.includes('network') || msg.includes('fetch')) {
        msg = 'Network error. Check internet connection.';
      }
      this.cb.onError?.(new Error(msg));
      this.setState('error');
      throw new Error(msg);
    }
  }

  async disconnect(): Promise<void> {
    this.disposed = true;
    this.audio.stopMic();
    this.audio.interruptPlayback();
    if (this.session) {
      try { this.session.close(); } catch {}
      this.session = null;
    }
    this.modelSpeaking = false;
    this.setState('disconnected');
  }

  private sendAudioChunk(pcm16: ArrayBuffer): void {
    if (!this.session) return;
    try {
      if (this.modelSpeaking) {
        this.audio.interruptPlayback();
        this.modelSpeaking = false;
        this.setState('listening');
      }
      this.session.sendRealtimeInput({
        audio: { data: this.bufferToBase64(pcm16), mimeType: 'audio/pcm;rate=16000' },
      });
    } catch (err) {
      console.warn('[LiveSession] sendAudioChunk failed', err);
    }
  }

  private handleMessage(msg: LiveServerMessage): void {
    if (msg.toolCall) {
      for (const fc of msg.toolCall.functionCalls ?? []) {
        this.handleToolCall(fc);
      }
    }
    const audioParts = msg.serverContent?.modelTurn?.parts?.filter((p) => p.inlineData?.data);
    if (audioParts && audioParts.length > 0) {
      for (const part of audioParts) {
        const b64 = part.inlineData!.data!;
        const pcm = this.base64ToBuffer(b64);
        this.audio.enqueueAudio(pcm);
      }
      if (!this.modelSpeaking) {
        this.modelSpeaking = true;
        this.setState('speaking');
      }
    }
    if (msg.serverContent?.turnComplete) {
      this.modelSpeaking = false;
      this.setState('listening');
      this.cb.onTurnEnd?.();
    }
    if (msg.serverContent?.interrupted) {
      this.audio.interruptPlayback();
      this.modelSpeaking = false;
      this.setState('listening');
    }
  }

  private async handleToolCall(fc: {
    id?: string;
    name?: string;
    arguments?: Record<string, unknown>;
  }): Promise<void> {
    const id = fc.id ?? crypto.randomUUID();
    const name = fc.name as ToolCall['name'];
    if (!name) return;
    const call: ToolCall = { id, name, args: fc.arguments ?? {} };
    this.cb.onToolCall?.(call);
    let result = 'OK';
    if (name === 'openWebsite') {
      const raw = String(call.args.url ?? '').trim();
      const url = this.normalizeUrl(raw);
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
        result = `Opened ${url}`;
      } catch {
        result = `Could not open ${url}`;
      }
    } else {
      result = `Unknown tool: ${name}`;
    }
    this.cb.onToolResponse?.(id, result);
    this.sendToolResponse(id, result);
  }

  private sendToolResponse(id: string, result: string): void {
    if (!this.session) return;
    try {
      this.session.sendToolResponse({
        functionResponses: [{ id, response: { result } }],
      });
    } catch (err) {
      console.warn('[LiveSession] sendToolResponse failed', err);
    }
  }

  private setState(s: SessionState): void {
    if (this.disposed && s !== 'disconnected') return;
    this.cb.onStateChange?.(s);
  }

  private normalizeUrl(raw: string): string {
    if (!raw) return 'about:blank';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  }

  private base64ToBuffer(b64: string): ArrayBuffer {
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.subarray(i, i + chunk);
      binary += String.fromCharCode.apply(null, slice as unknown as number[]);
    }
    return btoa(binary);
  }
}

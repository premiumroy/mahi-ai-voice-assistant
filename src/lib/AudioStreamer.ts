/**
 * AudioStreamer
 * Owns ALL raw Web Audio plumbing for the live voice session.
 */

export const INPUT_SAMPLE_RATE = 16_000;
export const OUTPUT_SAMPLE_RATE = 24_000;

export function float32ToPcm16(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(i * 2, s, true);
  }
  return buffer;
}

export function pcm16ToFloat32(buffer: ArrayBuffer): Float32Array {
  const view = new DataView(buffer);
  const out = new Float32Array(buffer.byteLength / 2);
  for (let i = 0; i < out.length; i++) {
    const s = view.getInt16(i * 2, true);
    out[i] = s / 0x8000;
  }
  return out;
}

function rms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.min(1, Math.sqrt(sum / buffer.length) * 2.2);
}

export interface AudioStreamerOptions {
  onInputLevel?: (level: number) => void;
  onOutputLevel?: (level: number) => void;
}

export class AudioStreamer {
  private ctx: AudioContext | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private onChunk: ((data: ArrayBuffer) => void) | null = null;
  private nextTime = 0;
  private readonly queue: AudioBuffer[] = [];
  private playing = false;
  private readonly scheduled: AudioBufferSourceNode[] = [];
  private meterRAF = 0;
  private readonly opts: AudioStreamerOptions;

  constructor(opts: AudioStreamerOptions = {}) {
    this.opts = opts;
  }

  async init(): Promise<void> {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor({ sampleRate: OUTPUT_SAMPLE_RATE });
    await this.ctx.resume();

    this.inputAnalyser = this.ctx.createAnalyser();
    this.inputAnalyser.fftSize = 256;

    this.outputAnalyser = this.ctx.createAnalyser();
    this.outputAnalyser.fftSize = 256;
    this.outputAnalyser.connect(this.ctx.destination);

    this.startMeterLoop();
  }

  async startMic(onChunk: (data: ArrayBuffer) => void): Promise<void> {
    if (!this.ctx) throw new Error('AudioStreamer.init() must be called first');
    this.onChunk = onChunk;

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });

    const source = this.ctx.createMediaStreamSource(this.micStream);
    if (this.inputAnalyser) source.connect(this.inputAnalyser);

    const useWorklet = await this.tryWorklet(source);
    if (!useWorklet) this.useScriptProcessor(source);
  }

  stopMic(): void {
    this.workletNode?.disconnect();
    this.workletNode = null;
    this.scriptNode?.disconnect();
    this.scriptNode = null;
    this.sourceNode?.disconnect();
    this.sourceNode = null;
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    this.onChunk = null;
  }

  private async tryWorklet(source: MediaStreamAudioSourceNode): Promise<boolean> {
    if (!this.ctx) return false;
    try {
      const workletCode = `
        const OUT_RATE = ${INPUT_SAMPLE_RATE};
        class MicProcessor extends AudioWorkletProcessor {
          constructor() { super(); this.buffer = []; }
          process(inputs) {
            const input = inputs[0];
            if (!input || !input[0]) return true;
            const ch = input[0];
            const inRate = sampleRate;
            for (let i = 0; i < ch.length; i++) this.buffer.push(ch[i]);
            const ratio = inRate / OUT_RATE;
            const outLen = Math.floor(this.buffer.length / ratio);
            if (outLen > 0) {
              const out = new Float32Array(outLen);
              for (let j = 0; j < outLen; j++) {
                const idx = Math.floor(j * ratio);
                out[j] = this.buffer[idx];
              }
              this.buffer.splice(0, Math.floor(outLen * ratio));
              const pcm = new ArrayBuffer(out.length * 2);
              const view = new DataView(pcm);
              for (let k = 0; k < out.length; k++) {
                let s = Math.max(-1, Math.min(1, out[k]));
                s = s < 0 ? s * 0x8000 : s * 0x7fff;
                view.setInt16(k * 2, s, true);
              }
              this.port.postMessage(pcm, [pcm]);
            }
            return true;
          }
        }
        registerProcessor('mic-processor', MicProcessor);
      `;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await this.ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      const node = new AudioWorkletNode(this.ctx, 'mic-processor');
      node.port.onmessage = (e: MessageEvent) => {
        const data = e.data as ArrayBuffer;
        this.onChunk?.(data);
      };
      source.connect(node);
      this.workletNode = node;
      return true;
    } catch (err) {
      console.warn('[AudioStreamer] AudioWorklet unavailable, falling back to ScriptProcessor', err);
      return false;
    }
  }

  private useScriptProcessor(source: MediaStreamAudioSourceNode): void {
    if (!this.ctx) return;
    const bufSize = 4096;
    const node = this.ctx.createScriptProcessor(bufSize, 1, 1);
    node.onaudioprocess = (e: AudioProcessingEvent) => {
      const input = e.inputBuffer.getChannelData(0);
      const ratio = this.ctx!.sampleRate / INPUT_SAMPLE_RATE;
      const outLen = Math.floor(input.length / ratio);
      const out = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        out[i] = input[Math.floor(i * ratio)];
      }
      this.onChunk?.(float32ToPcm16(out));
    };
    source.connect(node);
    node.connect(this.ctx.destination);
    this.scriptNode = node;
  }

  enqueueAudio(pcm16: ArrayBuffer): void {
    if (!this.ctx || !this.outputAnalyser) return;
    const samples = pcm16ToFloat32(pcm16);
    if (samples.length === 0) return;
    const typed = new Float32Array(new ArrayBuffer(samples.byteLength));
    typed.set(samples);
    const audioBuf = this.ctx.createBuffer(1, typed.length, OUTPUT_SAMPLE_RATE);
    audioBuf.copyToChannel(typed, 0);
    if (!this.playing) {
      this.nextTime = this.ctx.currentTime;
      this.playing = true;
    }
    this.scheduleBuffer(audioBuf);
  }

  private scheduleBuffer(buf: AudioBuffer): void {
    if (!this.ctx || !this.outputAnalyser) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.outputAnalyser);
    const startAt = Math.max(this.nextTime, this.ctx.currentTime);
    src.start(startAt);
    this.nextTime = startAt + buf.duration;
    this.scheduled.push(src);
    src.onended = () => {
      const idx = this.scheduled.indexOf(src);
      if (idx >= 0) this.scheduled.splice(idx, 1);
      if (this.scheduled.length === 0) {
        this.playing = false;
        this.opts.onOutputLevel?.(0);
      }
    };
  }

  interruptPlayback(): void {
    for (const src of this.scheduled) {
      try { src.onended = null; src.stop(); src.disconnect(); } catch { /* already stopped */ }
    }
    this.scheduled.length = 0;
    this.queue.length = 0;
    this.playing = false;
    this.nextTime = 0;
    this.opts.onOutputLevel?.(0);
  }

  isPlaying(): boolean { return this.playing; }

  private startMeterLoop(): void {
    const tick = () => {
      if (!this.ctx) return;
      if (this.inputAnalyser) {
        const buf = new Float32Array(this.inputAnalyser.fftSize);
        this.inputAnalyser.getFloatTimeDomainData(buf);
        this.opts.onInputLevel?.(rms(buf));
      }
      if (this.outputAnalyser && this.playing) {
        const buf = new Float32Array(this.outputAnalyser.fftSize);
        this.outputAnalyser.getFloatTimeDomainData(buf);
        this.opts.onOutputLevel?.(rms(buf));
      }
      this.meterRAF = requestAnimationFrame(tick);
    };
    this.meterRAF = requestAnimationFrame(tick);
  }

  async destroy(): Promise<void> {
    cancelAnimationFrame(this.meterRAF);
    this.stopMic();
    this.interruptPlayback();
    this.inputAnalyser?.disconnect();
    this.outputAnalyser?.disconnect();
    if (this.ctx) { try { await this.ctx.close(); } catch { /* ignore */ } }
    this.ctx = null;
    this.inputAnalyser = null;
    this.outputAnalyser = null;
  }
}

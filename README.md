# Mahi AI · Voice Assistant

A real-time, **voice-to-voice** AI assistant web app built with React, TypeScript, Tailwind CSS, and Vite.

Mahi is a young, confident, witty and sassy female persona — flirty and playful like a close girlfriend, smart and emotionally responsive, never robotic.

## Quick Start

```bash
npm install
cp .env.example .env.local  # Add your Gemini API key
npm run dev
```

Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey).

## Deploy on Vercel / Netlify

1. Fork or import this repo
2. Set environment variable `VITE_GEMINI_API_KEY`
3. Build command: `npm run build`
4. Output directory: `dist`

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- @google/genai (Gemini Live API)
- Web Audio API (AudioWorklet + ScriptProcessor fallback)

Made with ✨ and a little bit of sass.

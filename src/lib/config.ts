/** Environment-config helpers. */
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? '';

if (!API_KEY && import.meta.env.DEV) {
  console.warn(
    '[Mahi] Missing VITE_GEMINI_API_KEY — set it in a .env.local file to use the live API.',
  );
}

export const GEMINI_API_KEY = API_KEY;

/** The model id used for the audio-in/audio-out live session. */
export const GEMINI_MODEL = 'gemini-3.1-flash-live-preview';

/** Environment-config helpers. */

/**
 * The API key can be provided in any of these ways:
 * 1. Runtime: window.__GEMINI_API_KEY (set in index.html)
 * 2. localStorage: user pastes it in the UI prompt
 */
function getApiKey(): string {
  // Runtime global (set via index.html script tag or Netlify env)
  if (typeof window !== "undefined" && (window as any).__GEMINI_API_KEY) {
    return (window as any).__GEMINI_API_KEY;
  }
  // localStorage
  try {
    const stored = localStorage.getItem("GEMINI_API_KEY");
    if (stored) return stored;
  } catch {}
  return "";
}

export const GEMINI_API_KEY = getApiKey();

/** The model id used for the audio-in/audio-out live session. */
export const GEMINI_MODEL = "gemini-3.1-flash-live-preview";

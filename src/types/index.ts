/**
 * Shared type definitions for Mahi AI voice assistant.
 */

/** High-level connection / conversation state surfaced to the UI. */
export type SessionState =
  | 'disconnected'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'error';

/** Tool/function-call names the model is allowed to invoke. */
export type ToolName = 'openWebsite';

/** A function call request coming from the model. */
export interface ToolCall {
  id: string;
  name: ToolName;
  args: Record<string, unknown>;
}

/** A response we send back to the model after executing a tool. */
export interface ToolResponse {
  id: string;
  result: string;
}

/** Live metadata for the visualizer — live input/output audio levels. */
export interface AudioLevels {
  input: number; // 0..1
  output: number; // 0..1
}

/** Transient UI message (e.g. "Opening youtube.com…"). */
export interface Toast {
  id: string;
  text: string;
  kind: 'info' | 'action';
}

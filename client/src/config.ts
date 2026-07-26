/**
 * Central configuration. Values that used to be hardcoded across App.tsx live
 * here so the app can point at a non-local backend without code edits.
 */

const DEFAULT_API_BASE_URL = 'http://localhost:5000';

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

/** Capture resolution requested from the webcam, also the canvas size. */
export const VIDEO_WIDTH = 640;
export const VIDEO_HEIGHT = 480;

/** How often to re-check the backend while it is not ready yet (ms). */
export const STATUS_POLL_INTERVAL_MS = 2000;

/** Minimum gap between two detection round-trips (ms). */
export const FRAME_INTERVAL_MS = 50;

/** Abort a detection request that takes longer than this (ms). */
export const REQUEST_TIMEOUT_MS = 10_000;

/** JPEG quality used when encoding a frame for upload. */
export const FRAME_JPEG_QUALITY = 0.9;

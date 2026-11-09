import {
  DEFAULT_CANVAS_STATE,
  MAX_HEIGHT,
  MAX_WIDTH,
  MIN_HEIGHT,
  MIN_WIDTH,
  NOTE_COLORS,
} from "./model";
import type { CanvasState, Note } from "./model";

const STORAGE_KEY = "little-notes.canvas.v1";
const STORAGE_VERSION = 1;
// Older saves contain literal note colors; translate them to the theme's CSS variables on load.
const LEGACY_NOTE_COLORS: Record<string, string> = {
  "#fff0a8": "var(--note-yellow)",
  "#d9f0e2": "var(--note-green)",
  "#e7ddfa": "var(--note-lavender)",
  "#ffe0d2": "var(--note-peach)",
  "#dcecff": "var(--note-blue)",
};

export type CanvasLoadResult = {
  state: CanvasState;
  hasSavedState: boolean;
  error: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNote(value: unknown): value is Note {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isFiniteNumber(value.x) &&
    value.x >= 0 &&
    isFiniteNumber(value.y) &&
    value.y >= 0 &&
    isFiniteNumber(value.width) &&
    value.width >= MIN_WIDTH &&
    value.width <= MAX_WIDTH &&
    isFiniteNumber(value.height) &&
    value.height >= MIN_HEIGHT &&
    value.height <= MAX_HEIGHT &&
    typeof value.text === "string" &&
    typeof value.color === "string" &&
    (NOTE_COLORS.includes(value.color) || value.color in LEGACY_NOTE_COLORS)
  );
}

export function loadCanvasState(): CanvasLoadResult {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      return {
        state: DEFAULT_CANVAS_STATE,
        hasSavedState: false,
        error: null,
      };
    }

    const parsed: unknown = JSON.parse(saved);
    if (
      !isRecord(parsed) ||
      // Bump the version when changing the persisted shape so incompatible data is rejected safely.
      parsed.version !== STORAGE_VERSION ||
      !Array.isArray(parsed.notes) ||
      !parsed.notes.every(isNote) ||
      !isFiniteNumber(parsed.width) ||
      !isFiniteNumber(parsed.height)
    ) {
      throw new Error("Saved canvas data has an invalid format.");
    }

    return {
      state: {
        notes: parsed.notes.map((note) => ({
          ...note,
          color: LEGACY_NOTE_COLORS[note.color] ?? note.color,
        })),
        width: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed.width)),
        height: Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, parsed.height)),
      },
      hasSavedState: true,
      error: null,
    };
  } catch (error) {
    console.error("Could not load the saved canvas from local storage.", error);
    return {
      state: DEFAULT_CANVAS_STATE,
      hasSavedState: false,
      error:
        "Saved notes couldn't be loaded. Make a change to save a fresh copy.",
    };
  }
}

export function saveCanvasState(state: CanvasState) {
  const width = Number.isFinite(state.width)
    ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, state.width))
    : DEFAULT_CANVAS_STATE.width;
  const height = Number.isFinite(state.height)
    ? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, state.height))
    : DEFAULT_CANVAS_STATE.height;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: STORAGE_VERSION, ...state, width, height }),
  );
}

export function describeStorageError(error: unknown) {
  console.error("Could not save the canvas to local storage.", error);
  return "Changes couldn't be saved in this browser. Check its storage settings.";
}

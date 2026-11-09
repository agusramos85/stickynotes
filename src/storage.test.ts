import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CANVAS_STATE, NOTE_COLORS } from "./model";
import type { CanvasState } from "./model";
import {
  describeStorageError,
  loadCanvasState,
  saveCanvasState,
} from "./storage";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }
}

const storage = new MemoryStorage();

const sampleState: CanvasState = {
  notes: [
    {
      id: "note-1",
      x: 40,
      y: 75,
      width: 220,
      height: 180,
      text: "Remember the idea",
      color: NOTE_COLORS[0],
    },
  ],
  width: 260,
  height: 210,
};

afterEach(() => {
  storage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("canvas local storage", () => {
  it("returns default settings when nothing has been saved", () => {
    vi.stubGlobal("localStorage", storage);

    expect(loadCanvasState()).toEqual({
      state: DEFAULT_CANVAS_STATE,
      hasSavedState: false,
      error: null,
    });
  });

  it("saves and restores notes and default dimensions", () => {
    vi.stubGlobal("localStorage", storage);

    saveCanvasState(sampleState);

    expect(loadCanvasState()).toEqual({
      state: sampleState,
      hasSavedState: true,
      error: null,
    });
  });

  it("migrates saved note colors to theme tokens", () => {
    vi.stubGlobal("localStorage", storage);
    storage.setItem(
      "little-notes.canvas.v1",
      JSON.stringify({
        version: 1,
        ...sampleState,
        notes: [{ ...sampleState.notes[0], color: "#fff0a8" }],
      }),
    );

    expect(loadCanvasState().state.notes[0].color).toBe("var(--note-yellow)");
  });

  it("normalizes invalid default dimensions without losing notes", () => {
    vi.stubGlobal("localStorage", storage);
    saveCanvasState({ ...sampleState, width: Number.NaN, height: 900 });

    expect(loadCanvasState().state).toEqual({
      ...sampleState,
      width: DEFAULT_CANVAS_STATE.width,
      height: 420,
    });
  });

  it("rejects malformed saved data and reports a load error", () => {
    vi.stubGlobal("localStorage", storage);
    storage.setItem("little-notes.canvas.v1", "{invalid json");
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = loadCanvasState();

    expect(result.state).toEqual(DEFAULT_CANVAS_STATE);
    expect(result.hasSavedState).toBe(false);
    expect(result.error).toContain("couldn't be loaded");
    expect(console.error).toHaveBeenCalledOnce();
  });

  it("surfaces storage write errors to the caller", () => {
    const failingStorage = new MemoryStorage();
    vi.spyOn(failingStorage, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is full", "QuotaExceededError");
    });
    vi.stubGlobal("localStorage", failingStorage);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(describeStorageError(new Error("Storage is full"))).toContain(
      "couldn't be saved",
    );
    expect(console.error).toHaveBeenCalledOnce();
    expect(() => saveCanvasState(sampleState)).toThrow("Storage is full");
  });
});

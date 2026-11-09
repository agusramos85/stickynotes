export const MIN_WIDTH = 140;
export const MIN_HEIGHT = 120;
export const MAX_WIDTH = 420;
export const MAX_HEIGHT = 420;
export const NOTE_COLORS = [
  "var(--note-yellow)",
  "var(--note-green)",
  "var(--note-lavender)",
  "var(--note-peach)",
  "var(--note-blue)",
];

export type Note = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
};

type DragStateBase = {
  id: string;
  pointerX: number;
  pointerY: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ResizeEdges = {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
};

export type DragState =
  | (DragStateBase & { kind: "move" })
  | (DragStateBase & { kind: "resize"; edges: ResizeEdges });

export type CanvasState = {
  notes: Note[];
  width: number;
  height: number;
};

export const DEFAULT_CANVAS_STATE: CanvasState = {
  notes: [],
  width: 220,
  height: 190,
};

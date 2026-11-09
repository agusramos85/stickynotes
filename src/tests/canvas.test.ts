import { describe, expect, it } from "vitest";
import { getDraggedNote, overlapsTrashZone } from "../canvas";
import type { DragState } from "../model";

const moveDrag: DragState = {
  id: "note-1",
  kind: "move",
  pointerX: 100,
  pointerY: 100,
  x: 50,
  y: 60,
  width: 200,
  height: 160,
};

describe("getDraggedNote", () => {
  it("moves a note by the pointer delta", () => {
    expect(getDraggedNote(moveDrag, 130, 145, 600, 500)).toEqual({
      x: 80,
      y: 105,
      width: 200,
      height: 160,
    });
  });

  it("keeps a moved note within the board", () => {
    expect(getDraggedNote(moveDrag, 1000, 1000, 600, 500)).toEqual({
      x: 400,
      y: 340,
      width: 200,
      height: 160,
    });
  });

  it("enforces minimum and board-bounded maximum dimensions while resizing", () => {
    const resizeDrag = {
      ...moveDrag,
      kind: "resize" as const,
      edges: { top: false, right: true, bottom: true, left: false },
    };

    expect(getDraggedNote(resizeDrag, -1000, -1000, 600, 500)).toMatchObject({
      width: 140,
      height: 120,
    });
    expect(getDraggedNote(resizeDrag, 1000, 1000, 600, 500)).toMatchObject({
      width: 420,
      height: 420,
    });
  });

  it("resizes from the left while keeping the right edge fixed", () => {
    const result = getDraggedNote(
      {
        ...moveDrag,
        kind: "resize",
        edges: { top: false, right: false, bottom: false, left: true },
      },
      130,
      100,
      600,
      500,
    );

    expect(result).toEqual({ x: 80, y: 60, width: 170, height: 160 });
    expect(result.x + result.width).toBe(moveDrag.x + moveDrag.width);
  });

  it("resizes from the top while keeping the bottom edge fixed", () => {
    const result = getDraggedNote(
      {
        ...moveDrag,
        kind: "resize",
        edges: { top: true, right: false, bottom: false, left: false },
      },
      100,
      80,
      600,
      500,
    );

    expect(result).toEqual({ x: 50, y: 40, width: 200, height: 180 });
    expect(result.y + result.height).toBe(moveDrag.y + moveDrag.height);
  });
});

describe("overlapsTrashZone", () => {
  it("detects notes that overlap the trash target", () => {
    expect(
      overlapsTrashZone({ x: 420, y: 310, width: 30, height: 30 }, 600, 400),
    ).toBe(true);
  });

  it("does not count a note that only touches the trash target edge", () => {
    expect(
      overlapsTrashZone({ x: 400, y: 310, width: 32, height: 30 }, 600, 400),
    ).toBe(false);
  });
});

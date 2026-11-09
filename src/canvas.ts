import {
  MAX_HEIGHT,
  MAX_WIDTH,
  MIN_HEIGHT,
  MIN_WIDTH,
} from "./model";
import type { DragState, Note } from "./model";

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function overlapsTrashZone(
  note: Pick<Note, "x" | "y" | "width" | "height">,
  boardWidth: number,
  boardHeight: number,
) {
  // Match the desktop trash-zone dimensions and inset; mobile uses a smaller visual target.
  const trashX = boardWidth - 168;
  const trashY = boardHeight - 98;
  return (
    note.x < trashX + 148 &&
    note.x + note.width > trashX &&
    note.y < trashY + 78 &&
    note.y + note.height > trashY
  );
}

export function getDraggedNote(
  drag: DragState,
  pointerX: number,
  pointerY: number,
  boardWidth: number,
  boardHeight: number,
) {
  // Calculate from the drag-start snapshot so frequent pointer events don't accumulate rounding drift.
  const deltaX = pointerX - drag.pointerX;
  const deltaY = pointerY - drag.pointerY;

  if (drag.kind === "move") {
    return {
      x: clamp(drag.x + deltaX, 0, boardWidth - drag.width),
      y: clamp(drag.y + deltaY, 0, boardHeight - drag.height),
      width: drag.width,
      height: drag.height,
    };
  }

  let { x, y, width, height } = drag;
  const { top, right, bottom, left } = drag.edges;

  if (left) {
    const fixedRight = drag.x + drag.width;
    width = clamp(
      drag.width - deltaX,
      MIN_WIDTH,
      Math.min(MAX_WIDTH, fixedRight),
    );
    x = fixedRight - width;
  } else if (right) {
    width = clamp(
      drag.width + deltaX,
      MIN_WIDTH,
      Math.min(MAX_WIDTH, boardWidth - drag.x),
    );
  }

  if (top) {
    const fixedBottom = drag.y + drag.height;
    height = clamp(
      drag.height - deltaY,
      MIN_HEIGHT,
      Math.min(MAX_HEIGHT, fixedBottom),
    );
    y = fixedBottom - height;
  } else if (bottom) {
    height = clamp(
      drag.height + deltaY,
      MIN_HEIGHT,
      Math.min(MAX_HEIGHT, boardHeight - drag.y),
    );
  }

  return {
    x,
    y,
    width,
    height,
  };
}

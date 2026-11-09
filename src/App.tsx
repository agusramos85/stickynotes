import { useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { clamp, getDraggedNote, overlapsTrashZone } from "./canvas";
import {
  MAX_HEIGHT,
  MAX_WIDTH,
  MIN_HEIGHT,
  MIN_WIDTH,
  NOTE_COLORS,
} from "./model";
import type { DragState, Note, ResizeEdges } from "./model";
import {
  describeStorageError,
  loadCanvasState,
  saveCanvasState,
} from "./storage";

function App() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [initialLoad] = useState(loadCanvasState);
  const [notes, setNotes] = useState<Note[]>(initialLoad.state.notes);
  const [width, setWidth] = useState(initialLoad.state.width);
  const [height, setHeight] = useState(initialLoad.state.height);
  const [storageError, setStorageError] = useState(initialLoad.error);
  const [saveStatus, setSaveStatus] = useState(
    initialLoad.hasSavedState ? "Saved locally" : "Auto-save on",
  );
  const [isPlacing, setIsPlacing] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);

  useEffect(() => {
    // Keep an untouched initial load from immediately rewriting the saved data.
    if (
      notes === initialLoad.state.notes &&
      width === initialLoad.state.width &&
      height === initialLoad.state.height
    ) {
      return;
    }

    setSaveStatus("Saving…");
    // Debounce keystrokes and pointer movement to avoid writing on every event.
    const timeout = window.setTimeout(() => {
      try {
        saveCanvasState({ notes, width, height });
        setStorageError(null);
        setSaveStatus("Saved locally");
      } catch (error) {
        setStorageError(describeStorageError(error));
        setSaveStatus("Save failed");
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [initialLoad, notes, width, height]);

  useEffect(() => {
    if (!drag) return;

    const handlePointerMove = (event: PointerEvent) => {
      const board = boardRef.current;
      if (!board) return;

      const bounds = board.getBoundingClientRect();
      const next = getDraggedNote(
        drag,
        event.clientX,
        event.clientY,
        bounds.width,
        bounds.height,
      );
      setNotes((current) =>
        current.map((note) =>
          note.id === drag.id ? { ...note, ...next } : note,
        ),
      );

      if (drag.kind === "move") {
        setIsOverTrash(overlapsTrashZone(next, bounds.width, bounds.height));
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const board = boardRef.current;
      if (!board) {
        setDrag(null);
        setIsOverTrash(false);
        return;
      }

      if (
        drag.kind === "move" &&
        Math.hypot(
          event.clientX - drag.pointerX,
          event.clientY - drag.pointerY,
        ) > 3
      ) {
        const bounds = board.getBoundingClientRect();
        const next = getDraggedNote(
          drag,
          event.clientX,
          event.clientY,
          bounds.width,
          bounds.height,
        );
        if (overlapsTrashZone(next, bounds.width, bounds.height)) {
          setNotes((current) => current.filter((note) => note.id !== drag.id));
        }
      }

      setDrag(null);
      setIsOverTrash(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [drag]);

  const beginDrag = (
    event: ReactPointerEvent<HTMLElement>,
    note: Note,
    kind: DragState["kind"],
    edges?: ResizeEdges,
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    setIsPlacing(false);
    const dragStart = {
      id: note.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: note.x,
      y: note.y,
      width: note.width,
      height: note.height,
    };
    setDrag(
      kind === "move"
        ? { ...dragStart, kind }
        : {
            ...dragStart,
            kind,
            edges: edges ?? { top: false, right: true, bottom: true, left: false },
          },
    );
  };

  const resizeWithKeyboard = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    note: Note,
    edges: ResizeEdges,
  ) => {
    const delta = 10;
    const deltaX =
      event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0;
    const deltaY =
      event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0;
    if (
      (deltaX === 0 || (!edges.left && !edges.right)) &&
      (deltaY === 0 || (!edges.top && !edges.bottom))
    ) {
      return;
    }

    event.preventDefault();
    const board = boardRef.current;
    if (!board) return;
    const bounds = board.getBoundingClientRect();
    const resized = getDraggedNote(
      {
        id: note.id,
        kind: "resize",
        edges,
        pointerX: 0,
        pointerY: 0,
        x: note.x,
        y: note.y,
        width: note.width,
        height: note.height,
      },
      deltaX,
      deltaY,
      bounds.width,
      bounds.height,
    );
    setNotes((current) =>
      current.map((item) =>
        item.id === note.id ? { ...item, ...resized } : item,
      ),
    );
  };

  const placeNote = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isPlacing || !boardRef.current) return;
    const bounds = boardRef.current.getBoundingClientRect();
    const noteWidth = clamp(width, MIN_WIDTH, Math.min(MAX_WIDTH, bounds.width));
    const noteHeight = clamp(
      height,
      MIN_HEIGHT,
      Math.min(MAX_HEIGHT, bounds.height),
    );
    const x = clamp(
      event.clientX - bounds.left,
      0,
      Math.max(0, bounds.width - noteWidth),
    );
    const y = clamp(
      event.clientY - bounds.top,
      0,
      Math.max(0, bounds.height - noteHeight),
    );
    setNotes((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        x,
        y,
        width: noteWidth,
        height: noteHeight,
        text: "",
        color: NOTE_COLORS[current.length % NOTE_COLORS.length],
      },
    ]);
    setIsPlacing(false);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <p className="brand-name">little notes</p>
            <p className="brand-caption">a space for your thoughts</p>
          </div>
        </div>
        <div className="topbar-right">
          <span
            aria-live="polite"
            className={`save-status${storageError ? " is-error" : ""}`}
            role={storageError ? "alert" : "status"}
            title={storageError ?? undefined}
          >
            <span className="save-status-dot" />
            {storageError ?? saveStatus}
          </span>
          <span className="note-count">
            <span className="count-dot" />
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
          <button
            className={`place-button${isPlacing ? " is-cancel" : ""}`}
            onClick={() => setIsPlacing((current) => !current)}
            type="button"
          >
            <span aria-hidden="true">{isPlacing ? "×" : "+"}</span>
            {isPlacing ? "Cancel" : "New note"}
          </button>
        </div>
      </header>

      <section className="work-area" aria-label="Sticky note workspace">
        <div className="board-heading">
          <div>
            <p className="eyebrow">YOUR CANVAS</p>
            <h1>A place to think out loud.</h1>
          </div>
          <p className="board-date">
            <span aria-hidden="true">✳</span> Take it one thought at a time
          </p>
        </div>

        <div
          className={`board${isPlacing ? " is-placing" : ""}`}
          onClick={placeNote}
          ref={boardRef}
        >
          <div className="board-toolbar" onClick={(event) => event.stopPropagation()}>
            <div className="size-label">
              <span className="size-icon" aria-hidden="true">
                ↗
              </span>
              <span>Note size</span>
            </div>
            <label className="size-control">
              <span className="sr-only">Note width in pixels</span>
              <input
                aria-label="Drag to change note width"
                className="size-slider"
                max={MAX_WIDTH}
                min={MIN_WIDTH}
                onChange={(event) => setWidth(Number(event.target.value))}
                type="range"
                value={width}
              />
              <span className="size-value-wrap">
                <input
                  aria-label="Note width in pixels"
                  className="size-value"
                  max={MAX_WIDTH}
                  min={MIN_WIDTH}
                  onChange={(event) => setWidth(Number(event.target.value))}
                  type="number"
                  value={width}
                />
                <span className="unit">w</span>
              </span>
            </label>
            <span className="dimension-times">×</span>
            <label className="size-control">
              <span className="sr-only">Note height in pixels</span>
              <input
                aria-label="Drag to change note height"
                className="size-slider"
                max={MAX_HEIGHT}
                min={MIN_HEIGHT}
                onChange={(event) => setHeight(Number(event.target.value))}
                type="range"
                value={height}
              />
              <span className="size-value-wrap">
                <input
                  aria-label="Note height in pixels"
                  className="size-value"
                  max={MAX_HEIGHT}
                  min={MIN_HEIGHT}
                  onChange={(event) => setHeight(Number(event.target.value))}
                  type="number"
                  value={height}
                />
                <span className="unit">h</span>
              </span>
            </label>
            <span className="size-unit">px</span>
          </div>

          {notes.map((note) => (
            <article
              className={`note${drag?.id === note.id ? " is-dragging" : ""}`}
              key={note.id}
              onClick={(event) => event.stopPropagation()}
              style={
                {
                  "--note-color": note.color,
                  left: note.x,
                  top: note.y,
                  width: note.width,
                  height: note.height,
                } as CSSProperties
              }
            >
              <div
                aria-label="Drag to move note"
                className="note-grip"
                onPointerDown={(event) => beginDrag(event, note, "move")}
                title="Drag to move"
              >
                <span />
                <span />
              </div>
              <button
                aria-label="Resize note from top edge"
                className="resize-handle resize-handle--top"
                onKeyDown={(event) =>
                  resizeWithKeyboard(event, note, {
                    top: true,
                    right: false,
                    bottom: false,
                    left: false,
                  })
                }
                onPointerDown={(event) =>
                  beginDrag(event, note, "resize", {
                    top: true,
                    right: false,
                    bottom: false,
                    left: false,
                  })
                }
                title="Drag to resize"
                type="button"
              />
              <button
                aria-label="Resize note from right edge"
                className="resize-handle resize-handle--right"
                onKeyDown={(event) =>
                  resizeWithKeyboard(event, note, {
                    top: false,
                    right: true,
                    bottom: false,
                    left: false,
                  })
                }
                onPointerDown={(event) =>
                  beginDrag(event, note, "resize", {
                    top: false,
                    right: true,
                    bottom: false,
                    left: false,
                  })
                }
                title="Drag to resize"
                type="button"
              />
              <button
                aria-label="Resize note from bottom edge"
                className="resize-handle resize-handle--bottom"
                onKeyDown={(event) =>
                  resizeWithKeyboard(event, note, {
                    top: false,
                    right: false,
                    bottom: true,
                    left: false,
                  })
                }
                onPointerDown={(event) =>
                  beginDrag(event, note, "resize", {
                    top: false,
                    right: false,
                    bottom: true,
                    left: false,
                  })
                }
                title="Drag to resize"
                type="button"
              />
              <button
                aria-label="Resize note from left edge"
                className="resize-handle resize-handle--left"
                onKeyDown={(event) =>
                  resizeWithKeyboard(event, note, {
                    top: false,
                    right: false,
                    bottom: false,
                    left: true,
                  })
                }
                onPointerDown={(event) =>
                  beginDrag(event, note, "resize", {
                    top: false,
                    right: false,
                    bottom: false,
                    left: true,
                  })
                }
                title="Drag to resize"
                type="button"
              />
              <button
                aria-label="Resize note from top-left corner"
                className="resize-handle resize-handle--top-left"
                onKeyDown={(event) =>
                  resizeWithKeyboard(event, note, {
                    top: true,
                    right: false,
                    bottom: false,
                    left: true,
                  })
                }
                onPointerDown={(event) =>
                  beginDrag(event, note, "resize", {
                    top: true,
                    right: false,
                    bottom: false,
                    left: true,
                  })
                }
                title="Drag to resize"
                type="button"
              />
              <button
                aria-label="Resize note from top-right corner"
                className="resize-handle resize-handle--top-right"
                onKeyDown={(event) =>
                  resizeWithKeyboard(event, note, {
                    top: true,
                    right: true,
                    bottom: false,
                    left: false,
                  })
                }
                onPointerDown={(event) =>
                  beginDrag(event, note, "resize", {
                    top: true,
                    right: true,
                    bottom: false,
                    left: false,
                  })
                }
                title="Drag to resize"
                type="button"
              />
              <button
                aria-label="Resize note from bottom-left corner"
                className="resize-handle resize-handle--bottom-left"
                onKeyDown={(event) =>
                  resizeWithKeyboard(event, note, {
                    top: false,
                    right: false,
                    bottom: true,
                    left: true,
                  })
                }
                onPointerDown={(event) =>
                  beginDrag(event, note, "resize", {
                    top: false,
                    right: false,
                    bottom: true,
                    left: true,
                  })
                }
                title="Drag to resize"
                type="button"
              />
              <textarea
                aria-label="Note text"
                onChange={(event) => {
                  const text = event.target.value;
                  setNotes((current) =>
                    current.map((item) =>
                      item.id === note.id ? { ...item, text } : item,
                    ),
                  );
                }}
                placeholder="Write something..."
                value={note.text}
              />
              <span className="note-fold" aria-hidden="true" />
              <button
                aria-label="Resize note from bottom-right corner"
                className="resize-handle resize-handle--bottom-right"
                onKeyDown={(event) =>
                  resizeWithKeyboard(event, note, {
                    top: false,
                    right: true,
                    bottom: true,
                    left: false,
                  })
                }
                onPointerDown={(event) =>
                  beginDrag(event, note, "resize", {
                    top: false,
                    right: true,
                    bottom: true,
                    left: false,
                  })
                }
                title="Drag to resize"
                type="button"
              />
            </article>
          ))}

          {notes.length === 0 && !isPlacing && (
            <div className="empty-prompt">
              <div className="empty-sparkle" aria-hidden="true">
                ✳
              </div>
              <p className="empty-title">Your canvas is all yours.</p>
              <p>Start with a little note — click the button above.</p>
            </div>
          )}

          {isPlacing && (
            <div className="placement-hint">
              <span className="placement-crosshair" aria-hidden="true">
                +
              </span>
              Click anywhere to place your note
              <span className="hint-separator">·</span>
              {width} × {height}px
            </div>
          )}

          <div className={`trash-zone${isOverTrash ? " is-active" : ""}`}>
            <span aria-hidden="true">{isOverTrash ? "✦" : "⌫"}</span>
            <div>
              <strong>{isOverTrash ? "Let it go" : "Drop to remove"}</strong>
              <small>drag a note here</small>
            </div>
          </div>

          <div className="board-footer">
            <span>
              <kbd>drag</kbd> to move
            </span>
            <span className="footer-divider">·</span>
            <span>
              <kbd>edge</kbd> to resize
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;

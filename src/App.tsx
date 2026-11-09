import { useEffect, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import Canvas from "./components/Canvas";
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
  const { width, height } = initialLoad.state;
  const [storageError, setStorageError] = useState(initialLoad.error);
  const [saveStatus, setSaveStatus] = useState(
    initialLoad.hasSavedState ? "Saved locally" : "Auto-save on",
  );
  const [isPlacing, setIsPlacing] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);

  useEffect(() => {
    if (
      notes === initialLoad.state.notes &&
      width === initialLoad.state.width &&
      height === initialLoad.state.height
    ) {
      return;
    }

    setSaveStatus("Saving…");
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
            edges: edges ?? {
              top: false,
              right: true,
              bottom: true,
              left: false,
            },
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

  const changeNoteText = (id: string, text: string) => {
    setNotes((current) =>
      current.map((note) => (note.id === id ? { ...note, text } : note)),
    );
  };

  const startMovingNote = (
    event: ReactPointerEvent<HTMLElement>,
    note: Note,
  ) => beginDrag(event, note, "move");

  const startResizingNote = (
    event: ReactPointerEvent<HTMLElement>,
    note: Note,
    edges: ResizeEdges,
  ) => beginDrag(event, note, "resize", edges);

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

      <Canvas
        boardRef={boardRef}
        drag={drag}
        isOverTrash={isOverTrash}
        isPlacing={isPlacing}
        notes={notes}
        onMoveStart={startMovingNote}
        onPlaceNote={placeNote}
        onResizeKey={resizeWithKeyboard}
        onResizeStart={startResizingNote}
        onTextChange={changeNoteText}
      />
    </main>
  );
}

export default App;

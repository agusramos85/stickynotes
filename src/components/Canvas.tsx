import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import NoteCard from "./Note";
import type { DragState, Note, ResizeEdges } from "../model";

type CanvasProps = {
  boardRef: RefObject<HTMLDivElement | null>;
  notes: Note[];
  drag: DragState | null;
  isPlacing: boolean;
  isOverTrash: boolean;
  onPlaceNote: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onMoveStart: (
    event: ReactPointerEvent<HTMLElement>,
    note: Note,
  ) => void;
  onResizeStart: (
    event: ReactPointerEvent<HTMLElement>,
    note: Note,
    edges: ResizeEdges,
  ) => void;
  onResizeKey: (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    note: Note,
    edges: ResizeEdges,
  ) => void;
  onTextChange: (id: string, text: string) => void;
};

function Canvas({
  boardRef,
  notes,
  drag,
  isPlacing,
  isOverTrash,
  onPlaceNote,
  onMoveStart,
  onResizeStart,
  onResizeKey,
  onTextChange,
}: CanvasProps) {
  return (
    <section className="work-area" aria-label="Sticky note workspace">
      <div
        className={`board${isPlacing ? " is-placing" : ""}`}
        onClick={onPlaceNote}
        ref={boardRef}
      >
        {notes.map((note) => (
          <NoteCard
            isDragging={drag?.id === note.id}
            key={note.id}
            note={note}
            onMoveStart={onMoveStart}
            onResizeKey={onResizeKey}
            onResizeStart={onResizeStart}
            onTextChange={onTextChange}
          />
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
            <kbd>Drag the dotted grip</kbd> to move
          </span>
          <span className="footer-divider">·</span>
          <span>
            <kbd>Drag an edge or corner</kbd> to resize
          </span>
          <span className="footer-keyboard">
            Keyboard: focus a resize handle and use the arrow keys
          </span>
        </div>
      </div>
    </section>
  );
}

export default Canvas;

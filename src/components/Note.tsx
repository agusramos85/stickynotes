import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { Note as NoteModel, ResizeEdges } from "../model";

type ResizeHandle = {
  name: string;
  className: string;
  edges: ResizeEdges;
};

const RESIZE_HANDLES: ResizeHandle[] = [
  {
    name: "top edge",
    className: "top",
    edges: { top: true, right: false, bottom: false, left: false },
  },
  {
    name: "right edge",
    className: "right",
    edges: { top: false, right: true, bottom: false, left: false },
  },
  {
    name: "bottom edge",
    className: "bottom",
    edges: { top: false, right: false, bottom: true, left: false },
  },
  {
    name: "left edge",
    className: "left",
    edges: { top: false, right: false, bottom: false, left: true },
  },
  {
    name: "top-left corner",
    className: "top-left",
    edges: { top: true, right: false, bottom: false, left: true },
  },
  {
    name: "top-right corner",
    className: "top-right",
    edges: { top: true, right: true, bottom: false, left: false },
  },
  {
    name: "bottom-left corner",
    className: "bottom-left",
    edges: { top: false, right: false, bottom: true, left: true },
  },
  {
    name: "bottom-right corner",
    className: "bottom-right",
    edges: { top: false, right: true, bottom: true, left: false },
  },
];

type NoteCardProps = {
  note: NoteModel;
  isDragging: boolean;
  onMoveStart: (
    event: ReactPointerEvent<HTMLElement>,
    note: NoteModel,
  ) => void;
  onResizeStart: (
    event: ReactPointerEvent<HTMLElement>,
    note: NoteModel,
    edges: ResizeEdges,
  ) => void;
  onResizeKey: (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    note: NoteModel,
    edges: ResizeEdges,
  ) => void;
  onTextChange: (id: string, text: string) => void;
};

function NoteCard({
  note,
  isDragging,
  onMoveStart,
  onResizeStart,
  onResizeKey,
  onTextChange,
}: NoteCardProps) {
  return (
    <article
      className={`note${isDragging ? " is-dragging" : ""}`}
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
        aria-label="Move note. Drag this dotted handle."
        className="note-grip"
        onPointerDown={(event) => onMoveStart(event, note)}
        title="Drag this dotted handle to move the note"
      >
        <span />
        <span />
      </div>
      {RESIZE_HANDLES.map(({ name, className, edges }) => (
        <button
          aria-label={`Resize note from ${name}`}
          className={`resize-handle resize-handle--${className}`}
          key={className}
          onKeyDown={(event) => onResizeKey(event, note, edges)}
          onPointerDown={(event) => onResizeStart(event, note, edges)}
          title="Drag to resize"
          type="button"
        />
      ))}
      <textarea
        aria-label="Note text"
        onChange={(event) => onTextChange(note.id, event.target.value)}
        placeholder="Write something..."
        value={note.text}
      />
      <span className="note-fold" aria-hidden="true" />
    </article>
  );
}

export default NoteCard;

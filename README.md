# Little Notes

A single-page sticky-note canvas built with React, TypeScript, and Vite.

## Architecture

Little Notes is a client-rendered React and TypeScript application. `src/main.tsx` mounts the `App` component, which owns the canvas state and renders the toolbar, notes, and delete zone. Notes and drag operations use typed models from `src/model.ts`, while `src/canvas.ts` contains pure geometry helpers for bounded movement, edge or corner resizing, and delete-zone overlap. Keeping this logic separate makes interactions easy to test without a browser.

The app handles pointer input directly: notes move from their dotted top grip and resize from any edge or corner, with matching cursors and keyboard arrow-key resizing. The toolbar also sets the default size for newly placed notes. `src/storage.ts` validates and versions data in browser local storage; `App` debounces saves and reports failures in the interface. Styling is organized around a Sass palette and semantic CSS variables in `src/_palette.scss` and `src/_theme.scss`. Data is stored only in the current browser and is not synced between devices.

The main source files are `src/App.tsx` (interface and interaction state), `src/model.ts` (types and limits), `src/canvas.ts` (geometry), `src/storage.ts` (persistence), and `src/styles.scss` (layout and component styling). Vitest tests cover the geometry and storage helpers; Vite and TypeScript power local development and production builds.

## Run locally

1. Install Node.js 20.19+ or 22.12+.
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev`, then open the local URL Vite prints.
4. Run unit tests with `npm test`.
5. Create a production build with `npm run build`; preview it with `npm run preview`.

## Using the canvas

- Choose a note width and height, select **New note**, then click the canvas to place it.
- Drag a note's dotted top grip to move it; drag any edge or corner to resize it. You can also focus a resize handle and use the arrow keys.
- Drag a note into the **Drop to remove** zone to delete it.
- Notes and the selected default size are saved automatically in this browser.

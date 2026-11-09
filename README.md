# Little Notes

A single-page sticky-note canvas built with React, TypeScript, and Vite.

## Architecture

Little Notes is a client-rendered React and TypeScript application. `src/main.tsx` mounts `App`, which coordinates note state, placement, pointer and keyboard interactions, and save status. `src/components/Canvas.tsx` renders the workspace, empty and placement states, and delete zone. `src/components/Note.tsx` renders each editable note and its move and resize handles. Shared data and drag types live in `src/model.ts`; pure geometry helpers in `src/canvas.ts` keep movement, resizing, and trash-zone hit testing independent from the UI.

`src/storage.ts` validates and versions canvas data in browser local storage. `App` debounces updates, shows save progress, and reports storage errors. Styling uses a Sass palette bridged to semantic CSS variables, with responsive layout rules in `src/styles.scss`. On narrow screens the header compacts, and the canvas remains visible and scrollable; note interaction is primarily designed for a mouse or keyboard, so touch use may be limited. Saved notes stay in the current browser and are not synced between devices.

Vitest tests cover the geometry and storage helpers. Vite serves the development app and creates the production build, with TypeScript checking the source as part of that build.

## Run locally

1. Install Node.js 20.19+ or 22.12+.
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev`, then open the local URL Vite prints.
4. Run unit tests with `npm test`.
5. Create a production build with `npm run build`; preview it with `npm run preview`.

## Using the canvas

- Select **New note**, then click the canvas to place a note at its default size. Click **Cancel** to leave placement mode.
- Drag a note's dotted top grip to move it. Drag any edge or corner to resize it, or focus a resize handle and use the arrow keys.
- Drag a note into the **Drop to remove** zone to delete it.
- Notes are saved automatically in this browser. The header shows the save status and current note count.
- On a narrow screen, the header and canvas adapt to the viewport; scroll the canvas to reach notes outside the visible area. Touch gestures may not work as smoothly as mouse or keyboard controls.

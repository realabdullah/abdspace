# abdspace

The personal site of Abdullahi Odesanmi: work, writing, and what's playing right now.

Writing is pulled at build time from [abdspace-writings](https://github.com/realabdullah/abdspace-writings). Projects live in `content/projects/`.

## Development

```bash
pnpm install
pnpm sync:writings
pnpm dev
```

Copy `.env.example` to `.env` and add Spotify credentials to show the current track.

## Art directions

The glyph beside 明 in the header opens a second set of rooms. Each one is the same content and copy in a different layout and interaction, not a reskin:

- **紙 paper**: the editorial site.
- **張 tension**: one taut line, drawn in WebGL, with the work hanging from it in time order. Cross the line to pluck it. The pitch comes from the length of string between two pieces of work (Karplus–Strong), and what's playing on Spotify sets the tension.
- **譜 score**: the years as one spiral groove, one turn per year. Scroll, or turn the record by hand, and the needle plays it back; each piece of work rings as the needle passes it.
- **継 joinery**: the component tree as timber held together with tenons. Pull a piece out along its joint to read what it holds.
- **描 rendered**: the site drawn by its own renderer. Every letter is a signed distance field generated in the browser from the site's webfonts, laid out by a small line breaker with the fonts' own kerning, and drawn in two instanced draw calls. Hit-testing is a GPU pick into a single scissored pixel. A seam splits the page: finished on the left, and how it's drawn on the right (field contours, quads and line boxes, or the hit buffer). The cursor presses into the display type like a nib, and "view source" changes weight, tracking, leading, measure and size live, with the letters gliding to their new places. The engine is in `app/lib/render/`.

The rendered room opens from the click: the glyph you picked flies to its place in the room, the room is revealed as a circle from that point, and the letters ink in outward from it while the seam sweeps across.

The choice is stored in a cookie so the server renders the right room. Add `?room=<id>` to share one. Articles always stay on paper. The rooms live in `app/components/room/`, and the shared WebGL, audio and 3D helpers live in `app/lib/`.

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

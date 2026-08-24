# Team Tracker

A Kanban task tracker: drag-and-drop board, filtering by assignee (including manager/subordinate hierarchy), a public external ticket form, and round-robin auto-assignment.

## Stack

Next.js (App Router) + TypeScript, Prisma + SQLite, Tailwind, @dnd-kit for drag-and-drop, a small custom email/password auth layer (bcrypt + signed JWT cookie).

## Node.js

This machine didn't have Node.js installed, so it was downloaded locally to `~/.local/node` rather than installed system-wide. Every command below assumes that's on your `PATH` for the current shell:

```bash
export PATH="$HOME/.local/node/bin:$PATH"
```

Add that line to your `~/.zshrc` if you want it available in every new terminal, or install Node properly via [Homebrew](https://brew.sh) (`brew install node`) instead — either works fine going forward.

## Running it

```bash
npm install        # first time only
npm run dev
```

Then open http://localhost:3000. You'll land on `/login`.

## Database

SQLite file at `dev.db` (gitignored). Schema lives in `prisma/schema.prisma`.

- `npx prisma migrate dev` — apply schema changes
- `npx prisma db seed` — seeds one admin account (skips if any user already exists); the generated password is printed to the console, not stored anywhere else
- `npx prisma studio` — browse the database in a UI

## Layout

- `/board` — the Kanban board (protected)
- `/admin` — team members + round-robin pool management (admin role only)
- `/submit` — public ticket-intake form for people outside the team, no login required
- `app/api/**` — route handlers backing all of the above
- `lib/roundRobin.ts` / `lib/hierarchy.ts` — the two pieces of business logic worth reading first

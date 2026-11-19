---
description: Build the workshop app from the room's answers (input/submissions.json)
model: claude-opus-5-5
---

The form has closed and the feedback wall has written the room's approved answers to `input/submissions.json`. Build the app now, following CLAUDE.md step by step.

Before anything else:
- Note the start time (`date -u`). The 18-minute mark in CLAUDE.md counts from here.
- Confirm `input/submissions.json` exists and was exported in the last hour. `exportedAt` is UTC, so compare it with `date -u`. If it's missing or stale, stop and say so in one line: the presenter presses `C` on the wall to export it.
- Say in one line how many approved answers there are.
- Start the preview now, so it's ready for the check: `preview_start` with `live-build` (from `.claude/launch.json`; reuse it if port 5180 is already serving). Make sure the browser pane is **visible**: a hidden pane doesn't draw the map. If Claude in Chrome isn't connected, use the built-in pane and say so in one line.

Then:
- The `brief` field is the wall's rolling summary, written by a smaller model. Treat it as a hint only. Do your own synthesis from `answers`, `focus`, `roles` and `top`.
- Name the persona first, then synthesise, then present the plan with success criteria, and **stop and wait for approval**.
- After approval: build, then check by following CLAUDE.md step 6 exactly. Open popups from the console rather than by clicking the map, ignore only the two known scaffold 404s, and check at phone width as well.

Keep every message short: the room is reading it on the big screen.

# Session notes

Jack calls his time with a pupil a **session**. Use "session", "session note", "Session 6", "in our next session" everywhere: titles, kickers, running headers, file names (`session-6-note.pdf`) and prose. Never "lesson" unless Jack uses it himself or is quoting a page title. (Website copy is separate and keeps "lessons".)

## A session note worksheet

A session note is a worksheet written after a session for one pupil. It follows the usual worksheet sequence, framed around what happened:

- `title`: "Session 6 note" (or a topic title if Jack prefers).
- `kicker`: "Session note · Pupil Name · 3 November 2026".
- `runningHeader`: "Pupil Name · Session 6".
- Sections such as "This session", the material with figures, "Before next time". Only what Jack actually covered or asked for; never invent what the pupil said or did.
- Match the pupil's reading level (from their memory file): no notation for a pupil who doesn't read it yet, `show: "tab"` while TAB is being introduced, both once they read.

See `examples/worksheets/session-note.json`.

## The portal text

The Members portal takes pasted notes in this format (the "SESSION NOTES upload template" in the Project). Add a `portal` object to the worksheet and the builder writes `<slug>-portal.txt`:

```text
# THE LEITH BASS SPACE · SESSION NOTES
# Paste into Members > Add session > "Paste your notes".

Member: Pupil Name
Date: 2026-11-03
Start: 18:00
Length: 1h
Status: done
Block: yes

Covered:
...

Summary:
...

Objectives:
- ...

Files:
- session-6-note.pdf

Answered:
- ...

Listen:
- ...

Next time:
...
```

| `portal` field | Notes |
|---|---|
| `member` | Required; the pupil's name as it appears in the portal. |
| `date`, `start` | ISO date, 24-hour start time. Don't guess a start time: use the pupil's known slot or ask. |
| `length`, `status`, `block` | Default `1h`, `done`, `yes`. |
| `covered`, `summary`, `nextTime` | Short text. |
| `objectives`, `files`, `answered`, `listen` | Lists of short items. The PDF is added to `files` automatically. Empty lists are left out. |

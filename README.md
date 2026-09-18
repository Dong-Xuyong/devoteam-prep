# Devoteam Interview Prep

A mobile-first, privacy-sanitized study dashboard for a Devoteam Distributed
Cloud AI / Machine Learning Engineering interview.

Live site: <https://dong-xuyong.github.io/devoteam-prep/>

## What it includes

- Two-minute company and role briefing
- Evidence labels for facts, inferences, anecdotes, and unknowns
- Candidate proof-point rehearsal cards
- Technical ML and MLOps revision with flip cards
- Likely questions and answer guidance
- Questions to ask and neutral due diligence
- A local-only browser checklist
- Dark mode, keyboard navigation, search, filters, and print styles

## Run locally

Serve the folder over HTTP so the browser can load `data/prep.json`:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000/>.

## Privacy and security

The public repository contains only the static app, local theme assets, this
README, and a sanitized JSON dataset. It contains no CV, contact details,
private career records, meeting details, private salary preferences, or
unrelated recruiting records.

The app has no analytics, ads, remote fonts, or third-party JavaScript.
Checklist and theme preferences are stored only in the visitor's browser
through `localStorage`.

All dataset text is rendered through DOM text nodes. External source links are
accepted only when their protocol is HTTP or HTTPS.

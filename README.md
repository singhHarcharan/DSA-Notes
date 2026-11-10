# DSA Notes

A searchable, static interview-revision site generated from the original DOCX, PDF, and image notes. It uses Next.js and can be deployed directly to Vercel.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production build

```bash
npm run typecheck
npm run build
```

The static site is generated in `out/`.

## Deploy to Vercel

1. Push this folder to a Git repository.
2. Import the repository at [vercel.com/new](https://vercel.com/new).
3. Keep the detected Next.js settings and deploy.

The generated content in `data/notes.json`, `public/media`, and `public/resources` is committed with the site. Vercel does not need the original ZIP files.

## Re-import notes

The importer defaults to the seven named ZIP files in the current user's `Downloads` folder, including the complete Love Babbar beginner course:

```bash
npm run import-notes
```

It can also accept an explicit list of ZIP paths:

```bash
npm run import-notes -- "/absolute/path/notes-one.zip" "/absolute/path/notes-two.zip"
```

After importing, run `npm run build`. The importer:

- extracts text and hyperlinks from Word documents;
- extracts embedded images;
- preserves PDFs and standalone images;
- groups notes by topic and original collection;
- preserves the original module, folder, and lecture-number order from every course;
- preserves source-code indentation and renders syntax-highlighted, numbered code blocks;
- merges exact/high-confidence title and problem-link matches;
- retains different explanations as source variants;
- marks notes containing “pending”, “not done”, or “skipped” accordingly.

The import summary is written to `data/import-audit.json`.

## Browser-only revision data

Bookmarks, completion status, “needs review” status, theme, and recent notes are stored in the browser's local storage. They do not require an account, but they do not automatically sync between devices.

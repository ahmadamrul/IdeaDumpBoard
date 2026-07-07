# Deployment

IdeaDumpBoard is a pure static single-page app (no backend, no server-side
rendering) — the production build is just static files that any static host
can serve.

## Deploy to Vercel (recommended)

### Via the Vercel dashboard
1. Push this project to a GitHub (or GitLab/Bitbucket) repository.
   > Note: this project has no git repository initialized yet — run
   > `git init` first if you haven't (see [DEVELOPMENT.md](DEVELOPMENT.md)).
2. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Vercel auto-detects the Vite framework. Confirm the settings:
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
4. Click **Deploy**.

### Via the Vercel CLI
```bash
npm i -g vercel
vercel          # follow the prompts for a preview deploy
vercel --prod   # promote to production
```

## Deploy to Netlify (alternative)
Same build settings apply:
- **Build command**: `npm run build`
- **Publish directory**: `dist`

Either drag-and-drop the `dist/` folder onto Netlify's dashboard for a
one-off deploy, or connect the git repo for continuous deployment the same
way as Vercel.

## Environment Variables
None required today — there's no API key, backend URL, or secret to
configure. If Firebase backup is added later (see
[ROADMAP.md](ROADMAP.md)), this section will need Firebase config values
(API key, project id, etc.) set as environment variables in the hosting
provider's dashboard.

## Pre-Deploy Checklist
- [ ] `npm run build` completes without errors locally.
- [ ] `npm run preview` looks correct when opened in a real browser.
- [ ] No leftover `console.log`/debug code in changed files.

## Post-Deploy Notes
- Data lives in each visitor's own browser `localStorage` — deploying a new
  version does **not** migrate or reset anyone's saved boards, since nothing
  is stored server-side. Existing users keep their data as long as they
  don't clear their browser storage.
- Because there's no backend, there's no database migration step, no server
  restart, and no downtime window to plan around — a deploy is just serving
  new static files.

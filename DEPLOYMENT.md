# Vercel Deployment Guide

This guide covers deploying **aboycalledhero.co.uk** to Vercel using a Git-based workflow.

---

## Prerequisites

- A [Vercel](https://vercel.com) account (free tier is fine)
- Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket)
- Domain `aboycalledhero.co.uk` registered and accessible

---

## Step 1: Connect Repository to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your Git repository
4. Vercel auto-detects Next.js — confirm these settings:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)
5. Click **Deploy**

Vercel builds and deploys. You get a `*.vercel.app` preview URL.

---

## Step 2: Configure Environment Variables

In the Vercel project dashboard, go to **Settings → Environment Variables** and add:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_SECRET` | Yes | Random 32+ character string. Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Your production URL: `https://aboycalledhero.co.uk` |
| `ADMIN_USERNAME` | Yes | Login username for `/admin` |
| `ADMIN_PASSWORD_HASH` | Yes | Bcrypt hash of admin password. Generate with `node scripts/hash-password.js yourpassword` |

> **Important:** Environment variables must be set **before** deploying to production. They are only available at build/runtime, never committed to Git.

---

## Step 3: Custom Domain Setup

1. In Vercel dashboard, go to **Settings → Domains**
2. Add `aboycalledhero.co.uk`
3. Vercel provides DNS records (A + CNAME)
4. Update your domain registrar's DNS settings:
   - **A Record:** `@` → `76.76.21.21`
   - **CNAME Record:** `www` → `cname.vercel-dns.com`
5. Wait for DNS propagation (usually 5–60 minutes)
6. Vercel auto-provisions an SSL certificate

---

## Step 4: Data Persistence (File-Based CMS)

This project uses `lib/data.json` as its CMS. **Important considerations:**

### Vercel's Stateless Nature
Vercel deployments are stateless — the filesystem is read-only except for `/tmp`. Edits via the admin panel write to `lib/data.json`, but these changes **do not persist** across deployments.

### Recommended Strategy: Git-Based Persistence

**Option A: Manual Git Workflow (Recommended for now)**
1. Edit content locally or via admin preview
2. Export/download `lib/data.json` after editing
3. Commit changes to Git and push
4. Vercel auto-redeploys with updated data

**Option B: Vercel Blob / External Storage (Future)**
For automatic persistence without Git commits, migrate to:
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
- Or a lightweight DB like Turso/PlanetScale

> **Current workaround:** The admin panel works on Vercel for demo/testing, but changes reset on the next deploy. For a live site, always commit `lib/data.json` changes to Git.

---

## Step 5: Continuous Deployment

With Git connected, every `git push` to the main branch triggers a new deployment:

```bash
git add .
git commit -m "Update shows and bio"
git push origin main
```

Vercel builds, runs checks, and updates `aboycalledhero.co.uk` automatically.

### Preview Deployments
Pull requests get their own preview URLs — great for testing changes before merging.

---

## Step 6: Post-Deploy Checklist

- [ ] Site loads at `https://aboycalledhero.co.uk`
- [ ] Admin login works at `/admin/login`
- [ ] Edit mode (pencil icon) appears when logged in
- [ ] Secret game (`/secret-game`) loads and plays
- [ ] Music, merch, shows pages display correctly
- [ ] Contact form submits (if using external form service)
- [ ] Social links in footer point to correct URLs
- [ ] No 404s on hidden pages (if using page visibility toggles)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Unauthorized" on admin API | Check `NEXTAUTH_SECRET` and `NEXTAUTH_URL` env vars |
| Admin login fails | Verify `ADMIN_PASSWORD_HASH` is a valid bcrypt hash |
| Changes not showing | Ensure `lib/data.json` is committed and pushed |
| Build fails with TypeScript errors | Run `npm run build` locally first to catch issues |
| Images missing | Check `public/images/` paths are correct (case-sensitive) |
| Audio doesn't play | Browsers block autoplay; user interaction required first |

---

## Useful Commands

```bash
# Local production build test
npm run build
npx serve out        # if using static export (not recommended)
# or
npm start            # if using server output

# Generate admin password hash
node scripts/hash-password.js yourpassword

# Pull Vercel env vars locally (if using Vercel CLI)
npx vercel env pull .env.local
```

---

## Next.js 16 + Vercel Notes

- This project uses **Next.js 16.2.4** with the App Router
- Turbopack is used for local dev (`next dev --turbopack`)
- Production builds use standard Webpack (Turbopack prod is still stabilising)
- `next.config.ts` output mode is `standalone` or serverless (Vercel default)

---

## Support

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- Project README: `README.md`

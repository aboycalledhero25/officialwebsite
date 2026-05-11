# 🎸 A Boy Called Hero — Website Editing Guide

> **The easiest way:** Open `http://localhost:3000/admin` while the site is running.  
> You can edit all text, add/remove shows, releases, merch, and upload images through the browser.
>
> **The manual way:** Edit `lib/data.json` directly.

---

## 🖥️ Admin Dashboard (Recommended)

While the site is running, go to:

```
http://localhost:3000/admin
```

The admin panel lets you edit everything through a web interface:
- **Band** — name, tagline, bios, members, social links, emails
- **Releases** — add/edit singles, EPs, albums with lyrics and artwork paths
- **Shows** — add/remove gigs, dates, venues, ticket links
- **Merch** — products, prices, images, variants
- **Videos** — YouTube IDs, titles, descriptions
- **Press & Site** — press facts, SEO meta, news items
- **Images** — upload new images and copy their paths

Hit **Save Changes** when you're done. The site will update immediately.

---

## 📁 Manual Editing Reference

If you prefer editing the raw file directly, open `lib/data.json`.  
Everything the admin edits is stored there.

| What you want to change | Where to edit |
|------------------------|---------------|
| **Band name** | `lib/data.json` → `band.name` |
| **Tagline** (under the big name on homepage) | `lib/data.json` → `band.tagline` |
| **Bios** (short, medium, long) | `lib/data.json` → `band.bio` |
| **Band members** | `lib/data.json` → `band.members` |
| **Social media links** | `lib/data.json` → `band.social` |
| **Contact emails** | `lib/data.json` → `band.contact` |
| **Releases / singles** | `lib/data.json` → `releases` |
| **Show dates** | `lib/data.json` → `shows` |
| **Merch items** | `lib/data.json` → `merch` |
| **Videos** | `lib/data.json` → `videos` |
| **Press facts** | `lib/data.json` → `pressFacts` |
| **Page title / SEO description** | `lib/data.json` → `siteMeta` |
| **News items** (homepage) | `lib/data.json` → `newsItems` |
| **"For Fans Of" text** | `lib/data.json` → `forFansOf` |
| **Instagram handle** | `lib/data.json` → `instagramHandle` |
| **Images** | Drop files into `public/images/` (see below) |

---

## 🖼️ Images — How to Add / Replace

### Step 1: Drop your image files here
```
public/images/
```

### Step 2: Update the path in `lib/data.ts`

For example, to set the single artwork:
```ts
// lib/data.ts
export const releases = [
  {
    ...
    artwork: "/images/my-single-cover.jpg",  // <-- change this
    ...
  }
];
```

### Step 3: Common image references to update

| Image | Current path in `lib/data.ts` |
|-------|------------------------------|
| Single artwork | `releases[0].artwork` → `/images/placeholder-artwork.jpg` |
| Merch: Logo Tee | `merch[0].image` → `/images/placeholder-merch-tee.jpg` |
| Merch: SOTE Tee | `merch[1].image` → `/images/placeholder-merch-tee2.jpg` |
| Merch: Hoodie | `merch[2].image` → `/images/placeholder-merch-hoodie.jpg` |
| Merch: Stickers | `merch[3].image` → `/images/placeholder-merch-stickers.jpg` |
| Merch: Digital | `merch[4].image` → `/images/placeholder-merch-digital.jpg` |
| Social share image | `siteMeta.image` → `/images/og-image.jpg` |

### 📸 Placeholder images you still need to create

The site currently shows gradient placeholders with labels. To replace them with real photos, add these images to `public/images/` and update the paths in `lib/data.ts`:

1. **Single artwork** — `placeholder-artwork.jpg`
2. **Logo tee product photo** — `placeholder-merch-tee.jpg`
3. **SOTE tee product photo** — `placeholder-merch-tee2.jpg`
4. **Hoodie product photo** — `placeholder-merch-hoodie.jpg`
5. **Sticker pack photo** — `placeholder-merch-stickers.jpg`
6. **Digital bundle graphic** — `placeholder-merch-digital.jpg`
7. **Social share image** — `og-image.jpg` (used when sharing the site on Facebook/Twitter)

### 🎬 Video thumbnails
Videos use YouTube embeds. To make them work, replace `PLACEHOLDER` with real YouTube video IDs in `lib/data.ts`:
```ts
export const videos = [
  {
    ...
    youtubeId: "dQw4w9WgXcQ",  // <-- replace PLACEHOLDER with real ID
    ...
  }
];
```
> A YouTube video ID is the part after `v=` in the URL: `youtube.com/watch?v=dQw4w9WgXcQ`

---

## 📝 Deep Dive: `lib/data.ts`

Open `lib/data.ts`. It's organised into sections:

### 1. Band Info
```ts
export const band = {
  name: "A Boy Called Hero",
  tagline: "Turn it up until your neighbours hate you.",
  genre: "Pop Punk",
  location: "UK",
  formed: "2024",
  members: [
    { name: "Richie Lee Simon", role: "Vocals / Guitar" },
    { name: "Sam Keeble", role: "Drums / Backing Vocals" },
  ],
  bio: {
    elevator: "...",   // one-liner
    short: "...",      // paragraph
    medium: `...`,     // few paragraphs (used on Press page)
    long: `...`,       // full story (used on About page)
  },
  social: { ... },
  contact: { ... },
};
```

### 2. Releases
```ts
export const releases = [
  {
    id: "the-sound-of-the-end",
    title: "The Sound of the End",
    type: "Single",
    releaseDate: "2025-06-15",
    artwork: "/images/placeholder-artwork.jpg",
    description: "...",
    spotifyUrl: "...",    // replace PLACEHOLDER links
    appleMusicUrl: "...",
    youtubeUrl: "...",
    bandcampUrl: "...",
    lyrics: `...`,
    meaning: `...`,
  },
];
```

### 3. Shows / Gigs
```ts
export const shows = [
  {
    id: "show-001",
    date: "2025-07-18",
    venue: "The Joiners",
    city: "Southampton",
    country: "UK",
    ticketUrl: "#",       // replace with real ticket link
    status: "upcoming",   // or "past"
    supporting: "TBA",
  },
];
```

### 4. Merch
```ts
export const merch = [
  {
    id: "prod-logo-tee",
    title: "A Boy Called Hero — Logo Tee",
    price: 25.0,
    currency: "GBP",
    image: "/images/placeholder-merch-tee.jpg",
    variants: ["S", "M", "L", "XL", "XXL"],
    description: "...",
    handle: "abch-logo-tee",
  },
];
```

### 5. Videos
```ts
export const videos = [
  {
    id: "vid-001",
    title: "The Sound of the End — Official Video",
    youtubeId: "PLACEHOLDER",   // <-- replace this!
    type: "music-video",        // or "live" / "behind-the-scenes"
    description: "...",
  },
];
```

---

## 🎨 Homepage Sections

The homepage is built from sections in the `sections/` folder. If you want to change the wording of a section subtitle, open the relevant file:

| Section | File |
|---------|------|
| Big hero banner | `sections/home-hero.tsx` |
| Latest release | `sections/home-music.tsx` |
| Upcoming shows | `sections/home-shows.tsx` |
| News | `sections/home-news.tsx` |
| Merch preview | `sections/home-merch-preview.tsx` |
| Mailing list | `sections/home-mailing-list.tsx` |
| Instagram grid | `sections/home-instagram.tsx` |

---

## ⚡ How to see your changes

1. Make your edits in the **admin panel** (`/admin`) or directly in `lib/data.json`
2. **Save** (click "Save Changes" in the admin, or Ctrl+S in your code editor)
3. Refresh the browser to see the updates

If the site isn't running, open a terminal in the `aboycalledhero` folder and run:
```bash
npm run dev
```
Then open:
- `http://localhost:3000` — the website
- `http://localhost:3000/admin` — the editor

---

## 🔗 Quick-Replace Checklist (Copy & Tick Off)

- [ ] Replace `PLACEHOLDER` Spotify link with real artist URL
- [ ] Replace `PLACEHOLDER` Apple Music link with real URL
- [ ] Replace `PLACEHOLDER` YouTube links with real URLs
- [ ] Replace `PLACEHOLDER` YouTube video IDs in `videos`
- [ ] Add real single artwork to `public/images/placeholder-artwork.jpg`
- [ ] Add real merch photos to `public/images/`
- [ ] Update show dates / venues / ticket URLs
- [ ] Update contact emails (currently `booking@aboycalledhero.com` etc.)
- [ ] Add social share image `public/images/og-image.jpg`
- [ ] Update news items in `sections/home-news.tsx`

---

## ❓ Want a simpler way?

If editing code files feels intimidating, the alternative is to connect a **CMS** (Content Management System) like:
- **Sanity** — free, developer-friendly
- **Contentful** — generous free tier
- **Notion** + a sync script — write in Notion, publish to site

This would let you edit everything through a web dashboard instead of code files. If you want this, let me know and I can set one up for you.

# A Boy Called Hero — Official Website

A modern, responsive, production-ready website for the UK pop-punk duo **A Boy Called Hero**.

Built with **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS**, and **Framer Motion**.

---

## Table of Contents

1. [Research Summary](#research-summary)
2. [Sitemap & Content Strategy](#sitemap--content-strategy)
3. [Getting Started (Local Development)](#getting-started-local-development)
4. [Deployment](#deployment)
5. [Adding Shopify](#adding-shopify)
6. [Connecting Instagram](#connecting-instagram)
7. [Project Structure](#project-structure)
8. [Customisation](#customisation)

---

## Research Summary

### What a Pop Punk Band Website Needs in 2026

After analysing current successful band websites (Simple Plan, Breaking Benjamin, Sharam, The Only Majed) and industry best practices, here are the non-negotiables for a modern band site:

| Element | Why It Matters |
|---------|----------------|
| **Hero-first, music-above-the-fold** | Fans and promoters make decisions in <3 seconds. Lead with the latest release or tour. |
| **Dark theme + bold accents** | Matches the pop-punk/alternative aesthetic while maintaining readability. Simple Plan uses comic-book boldness; Breaking Benjamin uses gritty dark tones. |
| **Embedded streaming players** | Spotify/Apple Music embeds keep fans on-site. Never force a click-away to listen. |
| **Tour dates with ticket links** | Clear CTAs to drive ticket sales. Bandsintown/Songkick widgets are standard. |
| **Shopify-powered merch** | Merch is a major revenue stream. Buy Button JS v3.0 works for simple embeds, but the future-proof path is the **Shopify Storefront API**. |
| **Email capture everywhere** | Mailing lists remain the highest-ROI channel for artists. |
| **Instagram grid** | Social proof and visual storytelling. Fans expect to see recent content. |
| **EPK / Press page** | Booking agents skim EPKs in <60 seconds on mobile. Must include 3 bio lengths, press photos, embedded music/video, and clear contact. |
| **Video content** | YouTube embeds for music videos, live sessions, and behind-the-scenes. |
| **SEO + Schema** | MusicGroup structured data helps Google surface the band in knowledge panels and search results. |
| **Accessibility & Performance** | ARIA labels, keyboard nav, alt text, and Core Web Vitals (LCP <2.5s, CLS <0.1). |

### Key Insight
Fans discover via social media, but they **convert** on the website—streaming, buying tickets, purchasing merch, and joining mailing lists. The website is the central hub that should make every one of those actions frictionless.

---

## Sitemap & Content Strategy

```
/
├── /music          — Debut single, lyrics, meaning, embeds, future releases
├── /merch          — Shopify-ready product grid, variant selectors, buy CTAs
├── /about          — Band story, member profiles, photos, "for fans of"
├── /shows          — Upcoming gigs, past shows, ticket links
├── /media          — YouTube embeds (music video, live, behind-the-scenes)
├── /press          — EPK: 3 bios, press photos, facts, downloads, contact
└── /contact        — Contact form, emails, social links
```

| Page | Primary Goal | Key CTA |
|------|--------------|---------|
| Home | Convert visitors to fans | Stream / Buy Merch / Join Mailing List |
| Music | Deep engagement with releases | Stream / Read Lyrics |
| Merch | Drive merchandise revenue | Buy Now |
| About | Build emotional connection | Follow Socials |
| Shows | Drive ticket sales | Get Tickets |
| Media | Video engagement | Watch / Subscribe |
| Press | Enable bookings & press | Email / Download Assets |
| Contact | Capture inquiries | Send Message |

---

## Getting Started (Local Development)

### Prerequisites
- Node.js 18+ (recommended: 20 LTS)
- npm or yarn

### Install & Run

```bash
# Navigate into the project folder
cd aboycalledhero

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

This generates an optimised production build in the `.next/` folder.

---

## Deployment

### Option 1: Vercel (Recommended)

1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and create a new project.
3. Import your GitHub repository.
4. Vercel will auto-detect Next.js and configure the build settings.
5. Add any environment variables from `.env.local.example` in the Vercel dashboard.
6. Deploy. Every push to `main` will auto-deploy.

### Option 2: Netlify

1. Push to GitHub.
2. Go to [netlify.com](https://netlify.com) and import your repo.
3. Build command: `next build`
4. Publish directory: `.next`
5. Ensure the Next.js runtime is enabled in Netlify settings.

### Option 3: Static Export

If you need a fully static site (no server):

1. Update `next.config.ts`:
   ```ts
   const nextConfig = {
     output: 'export',
     distDir: 'dist',
   };
   ```
2. Run `npm run build`.
3. Upload the `dist/` folder to any static host (Cloudflare Pages, GitHub Pages, etc.).

> **Note:** Static export disables API routes and some dynamic features. For a band site with forms and future Shopify integration, Vercel/Netlify with serverless functions is recommended.

---

## Adding Shopify

The merch page is built with **Shopify-ready placeholder data**. There are three ways to connect a real store:

### Method A: Shopify Storefront API (Recommended)

This is the modern, future-proof approach (the JS Buy SDK was deprecated in 2025).

1. **Create a Shopify development store** or use your existing store.
2. In Shopify Admin, go to **Settings → Apps and sales channels → Develop apps**.
3. Create a private app, enable **Storefront API access**, and generate a **Storefront access token**.
4. Add to `.env.local`:
   ```
   SHOPIFY_STORE_DOMAIN=your-band.myshopify.com
   SHOPIFY_STOREFRONT_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
5. Create `lib/shopify.ts` with GraphQL queries. Example query:
   ```graphql
   query getProducts {
     products(first: 10) {
       edges {
         node {
           id
           title
           handle
           description
           variants(first: 1) {
             edges {
               node {
                 id
                 price { amount currencyCode }
               }
             }
           }
           images(first: 1) {
             edges {
               node { url altText }
             }
           }
         }
       }
     }
   }
   ```
6. Update `app/merch/page.tsx` to fetch real products server-side using the Storefront API.
7. Update `components/merch-card.tsx` to redirect to Shopify checkout or use the Cart API.

### Method B: Shopify Buy Button (Simple Embed)

1. In Shopify Admin, install the **Buy Button** sales channel.
2. Create a Buy Button for each product or collection.
3. Copy the generated `<div>` + `<script>` snippet.
4. Replace the `MerchCard` component contents with the embed code.
5. **Important:** Ensure you're using Buy Button JS v3.0+. Older versions will break after Shopify's deprecation deadline.

### Method C: Shopify Hydrogen (Headless)

For full headless control, consider [Shopify Hydrogen](https://hydrogen.shopify.dev/). This is overkill for a new band but scales well if merch becomes a major revenue driver.

---

## Connecting Instagram

The homepage includes a realistic Instagram grid placeholder. To connect a live feed, choose one of these approaches:

### Option A: Instagram Basic Display API

1. Go to [developers.facebook.com](https://developers.facebook.com) and create an app.
2. Add the **Instagram Basic Display** product.
3. Get your **App ID** and generate a **User Access Token**.
4. Fetch media from your backend or route handler:
   ```
   GET https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=YOUR_TOKEN
   ```
5. Map the response to the grid in `sections/home-instagram.tsx`.
6. **Security tip:** Never expose your access token in client-side code. Use a Next.js API route or server component to proxy the request.

### Option B: Third-Party Embed (Easiest)

No API or coding required:
- [SnapWidget](https://snapwidget.com/)
- [LightWidget](https://lightwidget.com/)
- [EmbedSocial](https://embedsocial.com/)

Generate a widget, copy the embed code, and paste it into `sections/home-instagram.tsx` in place of the placeholder grid.

### Option C: Meta Graph API

For business/creator accounts with more control:
- Requires Facebook Business verification.
- Gives access to insights, stories, and more.
- Best for bands with a dedicated social media manager.

---

## Project Structure

```
aboycalledhero/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout, fonts, metadata, JSON-LD schema
│   ├── page.tsx            # Homepage (composes sections)
│   ├── globals.css         # Tailwind theme + custom styles
│   ├── music/page.tsx
│   ├── merch/page.tsx
│   ├── about/page.tsx
│   ├── shows/page.tsx
│   ├── media/page.tsx
│   ├── press/page.tsx
│   └── contact/page.tsx
├── components/             # Reusable components
│   ├── navigation.tsx
│   ├── footer.tsx
│   ├── section-heading.tsx
│   ├── streaming-links.tsx
│   ├── merch-card.tsx
│   ├── show-card.tsx
│   ├── mailing-list.tsx
│   └── contact-form.tsx
├── sections/               # Homepage section components
│   ├── home-hero.tsx
│   ├── home-music.tsx
│   ├── home-news.tsx
│   ├── home-instagram.tsx
│   ├── home-mailing-list.tsx
│   ├── home-merch-preview.tsx
│   └── home-shows.tsx
├── lib/
│   ├── data.ts             # ALL band data, links, shows, releases, merch
│   └── utils.ts            # Utility helpers (cn, etc.)
├── public/images/          # Static images and placeholders
├── .env.local.example      # Example environment variables
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Customisation

### Update Band Details

**Everything** is centralised in `lib/data.ts`. Edit this single file to change:
- Band name, tagline, genre, location
- Member names and roles
- All bio lengths (elevator, short, medium, long)
- Social media links
- Contact emails
- Releases, lyrics, meanings
- Shows and tour dates
- Merch products, prices, variants
- YouTube video IDs
- Press facts

### Update Colours

Edit the CSS custom properties in `app/globals.css`:

```css
@theme inline {
  --color-background: #0a0a0a;
  --color-surface: #141414;
  --color-accent: #00f0ff;          /* Electric cyan */
  --color-accent-secondary: #ff006e; /* Hot pink */
  --color-accent-tertiary: #fcee0a;  /* Yellow */
}
```

### Add Real Images

Replace the placeholder gradient blocks in each page with actual `<Image>` components:

```tsx
import Image from "next/image";

<Image
  src="/images/your-photo.jpg"
  alt="Description"
  width={800}
  height={600}
  className="rounded-xl"
/>
```

Place images in `public/images/`.

### SEO & Metadata

Root metadata is defined in `app/layout.tsx`. Page-specific metadata is in each `page.tsx`.

The site includes:
- Open Graph tags for social sharing
- Twitter Card metadata
- JSON-LD `MusicGroup` structured data for Google
- Semantic HTML and accessible landmarks

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Fonts:** Inter (body), Bebas Neue (display) via `next/font`

---

## Licence

This project is built for **A Boy Called Hero**. All rights reserved.

import { z } from "zod";

export const bandMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
});

export const bandBioSchema = z.object({
  elevator: z.string(),
  short: z.string(),
  medium: z.string(),
  long: z.string(),
});

export const bandSocialSchema = z.object({
  instagram: z.string(),
  twitter: z.string(),
  facebook: z.string(),
  tiktok: z.string(),
  youtube: z.string(),
  spotify: z.string(),
  appleMusic: z.string(),
  bandcamp: z.string(),
});

export const bandContactSchema = z.object({
  booking: z.string().email().or(z.literal("")),
  press: z.string().email().or(z.literal("")),
  general: z.string().email().or(z.literal("")),
});

export const bandSchema = z.object({
  name: z.string().min(1),
  tagline: z.string(),
  genre: z.string(),
  location: z.string(),
  formed: z.string(),
  members: z.array(bandMemberSchema),
  bio: bandBioSchema,
  social: bandSocialSchema,
  contact: bandContactSchema,
});

export const releaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  type: z.string().min(1),
  releaseDate: z.string(),
  artwork: z.string(),
  description: z.string(),
  spotifyUrl: z.string(),
  appleMusicUrl: z.string(),
  youtubeUrl: z.string(),
  bandcampUrl: z.string(),
  embedUrl: z.string(),
  lyrics: z.string(),
  meaning: z.string(),
});

export const showSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1, "Date is required"),
  venue: z.string().min(1, "Venue is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  ticketUrl: z.string().nullable(),
  status: z.enum(["upcoming", "past"]),
  supporting: z.string(),
});

export const merchItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  price: z.number().min(0),
  currency: z.string().min(1),
  image: z.string(),
  variants: z.array(z.string()),
  description: z.string(),
  handle: z.string(),
});

export const videoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  youtubeId: z.string().min(1, "YouTube ID is required"),
  type: z.enum(["music-video", "live", "behind-the-scenes"]),
  description: z.string(),
});

export const pressFactSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const siteMetaSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  url: z.string().url().or(z.literal("")),
  image: z.string(),
  twitterHandle: z.string(),
});

export const newsItemSchema = z.object({
  date: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
});

export const aboutImageSchema = z.object({
  src: z.string().min(1),
  alt: z.string(),
  span: z.enum(["square", "wide", "tall", "large"]).optional(),
});

export const siteCopySchema = z.record(z.string(), z.any());

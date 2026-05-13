import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Hero Invaders",
  description: "Play Hero Invaders — the secret retro arcade game.",
  // iOS: run in standalone mode (no browser chrome) when added to home screen
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hero Invaders",
  },
};

export const viewport: Viewport = {
  // "viewport-fit=cover" lets the game render behind the iOS notch/home indicator
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function SecretGameLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

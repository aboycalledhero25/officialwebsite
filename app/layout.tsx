import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { DataProvider } from "@/components/data-provider";
import { TwitchProvider } from "@/components/twitch-status";
import { getData, getGuitarColors } from "@/lib/data-server";
import { auth } from "@/lib/auth";
import { AdminWrapper } from "@/components/edit-mode/admin-wrapper";
import { GuitarBackground } from "@/components/guitar-background";
import { BackgroundConfigProvider } from "@/components/background-config";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: getData().siteMeta.title,
  description: getData().siteMeta.description,
  metadataBase: new URL(getData().siteMeta.url),
  openGraph: {
    title: getData().siteMeta.title,
    description: getData().siteMeta.description,
    url: getData().siteMeta.url,
    siteName: getData().band.name,
    locale: "en_GB",
    type: "website",
    images: [
      {
        url: getData().siteMeta.image,
        width: 1200,
        height: 630,
        alt: `${getData().band.name} — ${getData().band.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: getData().siteMeta.title,
    description: getData().siteMeta.description,
    images: [getData().siteMeta.image],
    creator: getData().siteMeta.twitterHandle,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: getData().siteMeta.url,
  },
};

function MusicGroupSchema() {
  const data = getData();
  const schema = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: data.band.name,
    genre: data.band.genre,
    url: data.siteMeta.url,
    sameAs: [
      data.band.social.instagram,
      data.band.social.twitter,
      data.band.social.facebook,
      data.band.social.youtube,
      data.band.social.spotify,
    ],
    member: data.band.members.map((m) => ({
      "@type": "OrganizationRole",
      member: {
        "@type": "Person",
        name: m.name,
      },
      roleName: m.role,
    })),
    musicRelease: data.releases.map((r) => ({
      "@type": "MusicRelease",
      name: r.title,
      datePublished: r.releaseDate,
      url: r.spotifyUrl,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const data = getData();
  const guitarColors = getGuitarColors();
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  return (
    <html
      lang="en"
      className={`${inter.variable} ${bebas.variable} h-full antialiased`}
    >
      <head>
        <MusicGroupSchema />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <BackgroundConfigProvider>
          <GuitarBackground isAdmin={isAdmin} defaultColors={guitarColors} />
        </BackgroundConfigProvider>
        <div className="relative z-10 flex flex-col flex-1">
          <DataProvider initialData={data}>
            <TwitchProvider>
              <AdminWrapper isAdmin={isAdmin}>
                <Navigation />
                <main className="flex-1">{children}</main>
                <Footer />
              </AdminWrapper>
            </TwitchProvider>
          </DataProvider>
        </div>
      </body>
    </html>
  );
}

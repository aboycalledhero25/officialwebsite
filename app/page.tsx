import { HomeHero } from "@/sections/home-hero";
import { HomeMusic } from "@/sections/home-music";
import { HomeNews } from "@/sections/home-news";
import { HomeInstagram } from "@/sections/home-instagram";
import { HomeMailingList } from "@/sections/home-mailing-list";
import { HomeMerchPreview } from "@/sections/home-merch-preview";
import { HomeShows } from "@/sections/home-shows";
import { HomepageSecretHotspot } from "@/components/secret-game/homepage-hotspot";
import { getData } from "@/lib/data-server";

export default function Home() {
  const data = getData();
  const game = data.secretGame;

  return (
    <>
      <HomeHero />
      <HomeMusic />
      <HomeNews />
      <HomeShows />
      <HomeMerchPreview />
      <HomeInstagram />
      <HomeMailingList />

      {/* Hidden game hotspot */}
      {game?.enabled && <HomepageSecretHotspot />}
    </>
  );
}

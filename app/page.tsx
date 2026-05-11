import { HomeHero } from "@/sections/home-hero";
import { HomeMusic } from "@/sections/home-music";
import { HomeNews } from "@/sections/home-news";
import { HomeInstagram } from "@/sections/home-instagram";
import { HomeMailingList } from "@/sections/home-mailing-list";
import { HomeMerchPreview } from "@/sections/home-merch-preview";
import { HomeShows } from "@/sections/home-shows";

export default function Home() {
  return (
    <>
      <HomeHero />
      <HomeMusic />
      <HomeNews />
      <HomeShows />
      <HomeMerchPreview />
      <HomeInstagram />
      <HomeMailingList />
    </>
  );
}

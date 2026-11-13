import type { Metadata } from "next";
import { Bangers, Comic_Neue, Geist } from "next/font/google";
import { LocaleSync } from "@/components/LocaleSync";
import "./globals.css";

// Interface font.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Free fonts for the page content (docs/06-spec-editeur.md, step 6).
const comicNeue = Comic_Neue({
  variable: "--font-comic-neue",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const bangers = Bangers({
  variable: "--font-bangers",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Griotoon",
  description:
    "Crée des mangas, manhuas et webtoons : l'IA propose un brouillon, tu gardes la main sur chaque case.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // French by default; LocaleSync switches `lang` to the user's choice.
    <html
      lang="fr"
      className={`${geistSans.variable} ${comicNeue.variable} ${bangers.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocaleSync />
        {children}
      </body>
    </html>
  );
}

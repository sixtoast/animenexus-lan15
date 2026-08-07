import type { Metadata, Viewport } from "next";
import { Navbar } from "@/components/Navbar";
import { WatchlistProvider } from "@/components/WatchlistProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { ScrollProgress } from "@/components/ScrollProgress";
import { AIPanel } from "@/components/AIPanel";
import { CommandPalette } from "@/components/CommandPalette";
import { SakuraCanvas } from "@/components/SakuraCanvas";
import { PwaRegister } from "@/components/PwaRegister";
import { SessionTools } from "@/components/SessionTools";
import { ConfettiHost } from "@/components/ConfettiBurst";
import { ShortcutsHelp } from "@/components/ShortcutsHelp";
import { LoadingTheater } from "@/components/LoadingTheater";
import { RoomEnter } from "@/components/RoomEnter";
import { RouteTune } from "@/components/RouteTune";
import { LanternMemoryBoot } from "@/components/LanternMemoryBoot";
import { SealMomentHost } from "@/components/SealMoment";
import { EnvironmentController } from "@/components/EnvironmentController";
import { MascotHost } from "@/components/mascot/MascotHost";
import "./globals.css";
import "./button.css";
import "./modal.css";
import "./quote.css";
import "./ritual.css";
import "./seal-env.css";
import "./signal-motion.css";
import "./card-polish.css";
import "./nav-polish.css";
import "./layout-shell.css";
import "./mascot.css";
import "./sprint-a.css";
import "./ai-panel.css";
import "./cmdk.css";
import "./ancestry.css";
import "./session-tools.css";
import "./oracle-vibe.css";
import "./motion.css";
import "./desk.css";
import "./ui-lift.css";

export const metadata: Metadata = {
  title: "AnimeNexus — Lantern",
  description:
    "Mood-based anime recommendations, a deep taste profile, and AI-powered tools — late-night broadcast console.",
  applicationName: "AnimeNexus",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#120e0c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Outfit:wght@300;400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('anime_nexus_theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');var v=localStorage.getItem('anime_nexus_view_mode');if(v)document.documentElement.dataset.viewMode=v;var h=new Date().getHours();var tod=h<5||h>=21?'late-night':h<12?'morning':h<17?'afternoon':'evening';document.documentElement.dataset.tod=tod;}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <WatchlistProvider>
              <SessionProvider>
                <LanternMemoryBoot />
                <EnvironmentController />
                <ScrollProgress />
                <SakuraCanvas />
                <PwaRegister />
                <RouteTune />
                <Navbar />
                <div className="app-shell">
                  <RoomEnter>{children}</RoomEnter>
                </div>
                <MascotHost />
                <AIPanel />
                <CommandPalette />
                <SessionTools />
                <ConfettiHost />
                <SealMomentHost />
                <ShortcutsHelp />
                <LoadingTheater />
                <footer className="site-footer">
                  <div className="container site-footer-inner">
                    <span>AnimeNexus · Lantern</span>
                    <span className="site-footer-sep" aria-hidden>
                      ·
                    </span>
                    <span>
                      Data via{" "}
                      <a
                        href="https://anilist.co"
                        target="_blank"
                        rel="noreferrer"
                      >
                        AniList
                      </a>
                    </span>
                  </div>
                </footer>
              </SessionProvider>
            </WatchlistProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

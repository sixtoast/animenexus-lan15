"use client";

import { SignalEmpty } from "@/components/SignalEmpty";

export function WatchlistShelfEmpty() {
  return (
    <SignalEmpty
      kind="shelf"
      className="lantern-empty"
      title="The shelf is quiet"
      body="Lantern has nothing sealed here yet. When you add a title from any detail page, it becomes part of what the desk remembers."
      action={{ label: "Browse catalog →", href: "/browse" }}
      secondary={{ label: "Daily pick", href: "/daily" }}
    />
  );
}

export function WatchlistTabEmpty({ tab }: { tab: string }) {
  return (
    <SignalEmpty
      kind="shelf"
      className="lantern-empty"
      title="Nothing on this channel"
      body={`No titles in “${tab}” yet. Move something from another status, or add a new seal from a detail page.`}
    />
  );
}

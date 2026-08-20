import Link from "next/link";
import {
  toolPersonality,
  type ToolPersonalityId,
} from "@/lib/tool-personality";

type Props = {
  title: string;
  children: React.ReactNode;
  panel?: boolean;
  /** Distinct tool identity — same shell, different atmosphere */
  personality?: ToolPersonalityId;
};

/** Shared Night Desk chrome for tool pages — personality is atmosphere only. */
export function DeskShell({
  title,
  children,
  panel = true,
  personality,
}: Props) {
  const p = toolPersonality(personality);

  return (
    <div
      className="desk"
      data-desk-personality={p.accent}
      data-desk-tool={p.id}
    >
      <div className="desk-band">
        <span className="desk-band-left">
          <Link href="/tools">Tools</Link>
          {" · "}
          <strong>{title}</strong>
          <span className="desk-role" title={p.atmosphere}>
            {p.role}
          </span>
        </span>
        <Link href="/">← Home</Link>
      </div>
      <p className="desk-atmosphere">{p.atmosphere}</p>
      {panel ? <div className="desk-panel">{children}</div> : children}
    </div>
  );
}

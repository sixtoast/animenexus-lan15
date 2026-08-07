import Link from "next/link";

type Props = {
  title: string;
  children: React.ReactNode;
  panel?: boolean;
};

/** Shared Night Desk chrome for tool pages */
export function DeskShell({ title, children, panel = true }: Props) {
  return (
    <div className="desk">
      <div className="desk-band">
        <span>
          <Link href="/tools">Tools</Link>
          {" · "}
          <strong>{title}</strong>
        </span>
        <Link href="/">← Home</Link>
      </div>
      {panel ? <div className="desk-panel">{children}</div> : children}
    </div>
  );
}

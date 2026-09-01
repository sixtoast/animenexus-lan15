import Link from "next/link";

/** Studio names → soft studio desk routes */
export function StudioLinks({ studios }: { studios: string[] }) {
  if (!studios.length) return null;
  return (
    <p className="detail-studios">
      Studio{studios.length > 1 ? "s" : ""}:{" "}
      {studios.map((s, i) => (
        <span key={s}>
          {i > 0 ? ", " : null}
          <Link
            href={`/studio/${encodeURIComponent(s)}`}
            className="detail-studio-link"
          >
            {s}
          </Link>
        </span>
      ))}
    </p>
  );
}

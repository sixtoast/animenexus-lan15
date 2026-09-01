"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AnimeRelation } from "@/lib/types";
import { mergeRelations } from "@/lib/relation-merge";
import {
  resolveFranchise,
  franchiseSummaryLine,
  type FranchisePath,
} from "@/lib/franchise-resolver";

type Props = {
  centerId: number;
  centerTitle: string;
  centerYear?: number | string;
  centerFormat?: string;
  relations: AnimeRelation[];
};

export function FranchisePathPanel({
  centerId,
  centerTitle,
  centerYear,
  centerFormat,
  relations,
}: Props) {
  const [pathId, setPathId] = useState<FranchisePath["id"]>("main_story");

  const plan = useMemo(() => {
    if (!relations.length) return null;
    const merged = mergeRelations(
      relations.map((r) => ({
        id: r.id,
        title: r.title,
        relationType: r.relationType,
        format: r.format,
      })),
      [],
    );
    const enrich: Record<
      number,
      { title?: string; year?: number; format?: string }
    > = {};
    for (const r of relations) {
      enrich[r.id] = {
        title: r.title,
        year: r.year != null ? Number(r.year) : undefined,
        format: r.format,
      };
    }
    return resolveFranchise({
      center: {
        id: centerId,
        title: centerTitle,
        year: centerYear != null ? Number(centerYear) : undefined,
        format: centerFormat,
      },
      relations: merged,
      enrich,
    });
  }, [centerId, centerTitle, centerYear, centerFormat, relations]);

  if (!plan || plan.relationCount < 1) return null;

  const active =
    plan.paths.find((p) => p.id === pathId) ||
    plan.paths.find((p) => p.id === "main_story") ||
    plan.paths[0];

  if (!active || active.nodes.length < 2) return null;

  return (
    <section className="franchise-path" aria-label="Franchise watch paths">
      <div className="home-rail-head" style={{ marginBottom: 10 }}>
        <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Watch order</h2>
        <span className="home-rail-note">Evidence from relations · soft</span>
      </div>
      <p className="tools-hint" style={{ marginBottom: 10 }}>
        {franchiseSummaryLine(plan)}
      </p>
      <div className="franchise-path-tabs" role="tablist">
        {plan.paths.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active.id === p.id}
            className={
              "btn btn-sm " +
              (active.id === p.id ? "btn-accent" : "btn-outline")
            }
            onClick={() => setPathId(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {active.note ? (
        <p className="tools-hint franchise-path-note" role="status">
          {active.uncertain ? "Uncertain · " : ""}
          {active.note}
        </p>
      ) : active.uncertain ? (
        <p className="tools-hint" role="status">
          Approximate — relation graph is thin.
        </p>
      ) : null}
      <ol className="franchise-path-list">
        {active.nodes.map((n, i) => {
          const isCenter = n.id === centerId;
          return (
            <li
              key={n.id ?? n.externalId ?? n.title}
              className={
                "franchise-path-item" +
                (isCenter ? " franchise-path-item--center" : "")
              }
            >
              <span className="franchise-path-step" aria-hidden>
                {i + 1}
              </span>
              <div className="franchise-path-body">
                {n.id != null ? (
                  <Link href={`/anime/${n.id}`}>{n.title}</Link>
                ) : (
                  <span>{n.title}</span>
                )}
                <div className="franchise-path-meta">
                  {isCenter ? "You are here" : n.relationFromCenter || ""}
                  {n.year != null ? ` · ${n.year}` : ""}
                  {n.format ? ` · ${n.format}` : ""}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

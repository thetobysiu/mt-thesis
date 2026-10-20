"use client";
// Building blocks for slides on the 1280 × 720 canvas (sizes in px; the stage scales them).
import type { CSSProperties, ReactNode } from "react";

export const C = { blue: "var(--info)", green: "var(--ok)", orange: "#F59E0B", red: "var(--bad)", gold: "var(--gold)", muted: "var(--muted)" };
const accent = (c?: string): CSSProperties => (c ? ({ ["--accent-c" as string]: c } as CSSProperties) : {});

export function Bul({ children, size, gap }: { children: ReactNode; size?: number; gap?: number }) {
  return <ul className="sl-bul" style={{ fontSize: size, gap }}>{children}</ul>;
}

export function Card({ t, c, children, className = "", size }: { t: ReactNode; c?: string; children?: ReactNode; className?: string; size?: number }) {
  return (
    <div className={`sl-card ${className}`} style={{ ...accent(c), fontSize: size }}>
      <div className="t">{t}</div>
      {children}
    </div>
  );
}

export function Stat({ v, k, c, size }: { v: ReactNode; k: ReactNode; c?: string; size?: number }) {
  return (
    <div className="sl-stat" style={accent(c)}>
      <span className="v" style={{ fontSize: size }}>{v}</span>
      <span className="k">{k}</span>
    </div>
  );
}

export function Banner({ children, c }: { children: ReactNode; c?: string }) {
  return <div className="sl-banner" style={c ? { borderColor: c, color: c } : undefined}>{children}</div>;
}

export function Img({ src, alt, caption, className = "" }: { src: string; alt: string; caption?: ReactNode; className?: string }) {
  return (
    <figure className={`m-0 flex flex-col gap-1 min-h-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, thesis figures */}
      <img className="sl-img flex-1 min-h-0" src={src} alt={alt} />
      {caption && <figcaption className="text-[12px] muted italic text-center">{caption}</figcaption>}
    </figure>
  );
}

/** Simple table: first row is the header; cells may carry "good"/"bad" fills via `fill`. */
export function Tbl({ rows, fill, size, center = true }: { rows: ReactNode[][]; fill?: (r: number, c: number) => "good" | "bad" | undefined; size?: number; center?: boolean }) {
  const [headRow, ...body] = rows;
  return (
    <table className="sl-tbl" style={{ fontSize: size }}>
      <thead><tr>{headRow.map((h, j) => <th key={j} className={center && j ? "c" : ""}>{h}</th>)}</tr></thead>
      <tbody>
        {body.map((r, i) => (
          <tr key={i}>
            {r.map((v, j) => {
              const f = fill?.(i + 1, j);
              return <td key={j} className={`${center && j ? "c" : ""} ${f === "good" ? "sl-good" : f === "bad" ? "sl-bad" : ""}`}>{v}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Row of choices that switch what a demo shows. */
export function Switch<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {options.map(([v, l]) => <button key={v} role="tab" aria-selected={value === v} className="btn btn-sm" onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

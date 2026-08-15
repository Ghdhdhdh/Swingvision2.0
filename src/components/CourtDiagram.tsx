import { COURT, courtLines } from "../lib/court";
import type { Point, Shot } from "../types";

interface CourtDiagramProps {
  shots?: Shot[];
  highlight?: Point | null;
  className?: string;
}

const PAD = 1.2;
const W = COURT.doublesWidth + PAD * 2;
const H = COURT.length + PAD * 2;

/** Top-down SVG diagram of a tennis court, optionally plotting bounce points. */
export function CourtDiagram({ shots = [], highlight, className }: CourtDiagramProps) {
  const lines = courtLines();

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label="Tennis court diagram"
    >
      <rect x={0} y={0} width={W} height={H} rx={0.3} fill="#0f1f14" />
      <rect
        x={PAD}
        y={PAD}
        width={COURT.doublesWidth}
        height={COURT.length}
        fill="#154023"
      />
      {lines.map(([a, b], i) => (
        <line
          key={i}
          x1={a.x + PAD}
          y1={a.y + PAD}
          x2={b.x + PAD}
          y2={b.y + PAD}
          stroke="#eaf2ec"
          strokeWidth={0.06}
          strokeLinecap="round"
        />
      ))}
      {shots.map((s) => (
        <circle
          key={s.id}
          cx={s.courtPoint.x + PAD}
          cy={s.courtPoint.y + PAD}
          r={0.22}
          fill={s.call === "IN" ? "#34d399" : "#f87171"}
          fillOpacity={0.85}
          stroke="#0a0f0d"
          strokeWidth={0.04}
        />
      ))}
      {highlight && (
        <circle
          cx={highlight.x + PAD}
          cy={highlight.y + PAD}
          r={0.3}
          fill="none"
          stroke="#ccff00"
          strokeWidth={0.08}
        />
      )}
    </svg>
  );
}

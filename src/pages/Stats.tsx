import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../state/SessionContext";
import { CourtDiagram } from "../components/CourtDiagram";
import type { Shot } from "../types";

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatClock(ts: number, startedAt: number | null): string {
  if (!startedAt) return "—";
  return formatDuration(ts - startedAt);
}

export function Stats() {
  const session = useSession();
  const navigate = useNavigate();
  const { shots } = session;

  if (shots.length === 0 && session.status === "idle") {
    return (
      <div className="container">
        <div className="card" style={{ marginTop: 48, textAlign: "center" }}>
          <h2>No session yet</h2>
          <p style={{ marginTop: 8, marginBottom: 20 }}>
            Start a live tracking session to generate line calls and stats.
          </p>
          <Link to="/track" className="btn btn-primary">
            Go to live tracking
          </Link>
        </div>
      </div>
    );
  }

  const inCount = shots.filter((s) => s.call === "IN").length;
  const outCount = shots.length - inCount;
  const inPct = shots.length ? Math.round((inCount / shots.length) * 100) : 0;

  const speeds = shots.map((s) => s.speedKph).filter((v): v is number => v != null);
  const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null;
  const maxSpeed = speeds.length ? Math.max(...speeds) : null;

  const closestCall = shots.length
    ? shots.reduce((a, b) => (Math.abs(b.marginMeters) < Math.abs(a.marginMeters) ? b : a))
    : null;

  const duration =
    session.startedAt && session.endedAt ? session.endedAt - session.startedAt : null;

  function startNewSession() {
    session.resetSession();
    navigate("/track");
  }

  return (
    <div className="container">
      <div className="stats-header">
        <div>
          <h1 style={{ fontSize: 32 }}>Session stats</h1>
          <p style={{ marginTop: 6 }}>
            {session.courtMode === "singles" ? "Singles" : "Doubles"} court
            {duration != null ? ` · ${formatDuration(duration)}` : ""}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={startNewSession}>
          Start new session
        </button>
      </div>

      <section className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{shots.length}</div>
          <div className="stat-label">Total shots</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--in)" }}>
            {inCount}
          </div>
          <div className="stat-label">In</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--out)" }}>
            {outCount}
          </div>
          <div className="stat-label">Out</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{shots.length ? `${inPct}%` : "—"}</div>
          <div className="stat-label">In rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{avgSpeed ? `${avgSpeed.toFixed(0)}` : "—"}</div>
          <div className="stat-label">Avg speed km/h</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{maxSpeed ? `${maxSpeed.toFixed(0)}` : "—"}</div>
          <div className="stat-label">Top speed km/h</div>
        </div>
      </section>

      <section className="stats-section stats-grid">
        <div className="card">
          <div className="panel-title">Bounce heatmap</div>
          <CourtDiagram shots={shots} className="heatmap-court" />
          {closestCall && (
            <p style={{ fontSize: 13, marginTop: 12, textAlign: "center" }}>
              Closest call: <strong>{closestCall.call}</strong> by{" "}
              {Math.abs(closestCall.marginMeters * 100).toFixed(0)} cm
            </p>
          )}
        </div>

        <div className="card">
          <div className="panel-title">Shot log</div>
          {shots.length === 0 ? (
            <div className="empty-state">No shots were recorded in this session.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="log-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Time</th>
                    <th>Call</th>
                    <th>Margin</th>
                    <th>Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {shots.map((s: Shot, i: number) => (
                    <tr key={s.id}>
                      <td>{i + 1}</td>
                      <td>{formatClock(s.timestamp, session.startedAt)}</td>
                      <td>
                        <span
                          className={"badge " + (s.call === "IN" ? "badge-in" : "badge-out")}
                        >
                          {s.call}
                        </span>
                      </td>
                      <td>{(Math.abs(s.marginMeters) * 100).toFixed(0)} cm</td>
                      <td>{s.speedKph ? `${s.speedKph.toFixed(0)} km/h` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

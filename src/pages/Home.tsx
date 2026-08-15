import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: "🎾",
    title: "Live ball tracking",
    body: "Point your camera at the court and the ball is detected and tracked frame by frame, right in the browser.",
  },
  {
    icon: "📏",
    title: "Automatic line calls",
    body: "Calibrate the court once and every bounce is mapped onto real court geometry for an instant IN / OUT call.",
  },
  {
    icon: "📊",
    title: "Post-match stats",
    body: "When the video ends, get a full breakdown: shot count, in/out ratio, bounce heatmap, and rally-by-rally speed.",
  },
];

const STEPS = [
  {
    title: "Start a session",
    body: "Use your webcam for live play or upload a recorded video of a rally.",
  },
  {
    title: "Calibrate the court",
    body: "Click the four corners of the court once so the app can map pixels to real court coordinates.",
  },
  {
    title: "Play",
    body: "Every bounce is tracked live with an on-screen IN / OUT call as it happens.",
  },
  {
    title: "Review your stats",
    body: "End the session to see a full stat sheet and a heatmap of every bounce on the court.",
  },
];

export function Home() {
  return (
    <div className="container">
      <section className="hero">
        <span className="eyebrow">● On-device computer vision</span>
        <h1>Line calls and stats for every match, from your browser.</h1>
        <p className="lead">
          SwingVision 2.0 tracks the ball live, calls the lines automatically, and
          turns every session into a full stat sheet — no app install, no
          hardware, just a camera.
        </p>
        <div className="hero-actions">
          <Link to="/track" className="btn btn-primary">
            Start live tracking
          </Link>
          <Link to="/stats" className="btn">
            View last session stats
          </Link>
        </div>
      </section>

      <section className="feature-grid">
        {FEATURES.map((f) => (
          <div className="feature-card" key={f.title}>
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 style={{ fontSize: 22, marginBottom: 4 }}>How it works</h2>
        <p style={{ fontSize: 14 }}>Four steps from first serve to final stats.</p>
        <div className="steps">
          {STEPS.map((s, i) => (
            <div className="step" key={s.title}>
              <div className="step-num">{i + 1}</div>
              <div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

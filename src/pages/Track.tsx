import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../state/SessionContext";
import { CourtDiagram } from "../components/CourtDiagram";
import { loadBallModel, detectBall, type BallDetection } from "../lib/ballDetector";
import { computeHomography, applyHomography, type Homography } from "../lib/homography";
import { DOUBLES_CORNERS, callLine } from "../lib/court";
import { TrajectoryTracker } from "../lib/trajectory";
import { estimateSpeedKph } from "../lib/speed";
import type { CourtMode, Point, Shot } from "../types";

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function playCallTone(call: "IN" | "OUT") {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = call === "IN" ? 880 : 220;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch {
    // audio is a nice-to-have; ignore if unsupported/blocked
  }
}

export function Track() {
  const session = useSession();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<Awaited<ReturnType<typeof loadBallModel>> | null>(null);
  const trackerRef = useRef(new TrajectoryTracker());
  const busyRef = useRef(false);
  const lastDetectionRef = useRef<BallDetection | null>(null);

  const statusRef = useRef(session.status);
  const homographyRef = useRef<Homography | null>(session.homography);
  const courtModeRef = useRef<CourtMode>(session.courtMode);

  useEffect(() => {
    statusRef.current = session.status;
  }, [session.status]);
  useEffect(() => {
    homographyRef.current = session.homography;
  }, [session.homography]);
  useEffect(() => {
    courtModeRef.current = session.courtMode;
  }, [session.courtMode]);

  const [videoReady, setVideoReady] = useState(false);
  const [inputMode, setInputMode] = useState<"camera" | "upload" | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [calibPoints, setCalibPoints] = useState<Point[]>([]);
  const [courtCorners, setCourtCorners] = useState<Point[]>([]);
  const [flash, setFlash] = useState<{ call: "IN" | "OUT"; key: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBallModel()
      .then((m) => {
        modelRef.current = m;
        setModelReady(true);
      })
      .catch(() => setError("Could not load the ball-detection model."));
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setInputMode("camera");
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
    } catch {
      setError("Camera access was denied or is unavailable.");
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setInputMode("upload");
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      video.src = URL.createObjectURL(file);
      video.play().catch(() => {});
    }
  }

  function onLoadedMetadata() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    setVideoReady(true);
  }

  function beginCalibration() {
    session.setHomography(null);
    setCourtCorners([]);
    setCalibPoints([]);
    setCalibrating(true);
    session.setStatus("calibrating");
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!calibrating) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const point: Point = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
    const next = [...calibPoints, point];
    setCalibPoints(next);

    if (next.length === 4) {
      try {
        const H = computeHomography(next, DOUBLES_CORNERS);
        session.setHomography(H);
        setCourtCorners(next);
        setCalibrating(false);
        session.setStatus("idle");
      } catch {
        setError("Those four points don't form a valid court outline — try again.");
        setCalibPoints([]);
      }
    }
  }

  function startTracking() {
    trackerRef.current.reset();
    session.startSession();
  }

  function endTracking() {
    session.endSession();
    navigate("/stats");
  }

  function triggerFlash(call: "IN" | "OUT") {
    setFlash({ call, key: Date.now() });
    playCallTone(call);
    window.setTimeout(() => setFlash(null), 1100);
  }

  function handleDetection(det: BallDetection | null) {
    lastDetectionRef.current = det;
    if (!det) return;

    const t = performance.now();
    trackerRef.current.push({ x: det.center.x, y: det.center.y, t });

    const bounce = trackerRef.current.detectBounce();
    const H = homographyRef.current;
    if (bounce && H) {
      const courtPoint = applyHomography(H, bounce);
      const { call, marginMeters } = callLine(courtPoint, courtModeRef.current);

      const trail = trackerRef.current.getTrail();
      let speedKph: number | null = null;
      if (trail.length >= 2) {
        speedKph = estimateSpeedKph(H, trail[trail.length - 2], trail[trail.length - 1]);
      }

      const shot: Shot = {
        id: makeId(),
        timestamp: Date.now(),
        courtPoint,
        call,
        marginMeters,
        speedKph,
      };
      session.addShot(shot);
      triggerFlash(call);
    }
  }

  function draw() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const corners = courtCorners.length === 4 ? courtCorners : null;
    const pointsToOutline = corners ?? (calibrating ? calibPoints : []);

    if (pointsToOutline.length > 1) {
      ctx.strokeStyle = corners ? "rgba(204,255,0,0.85)" : "rgba(204,255,0,0.6)";
      ctx.lineWidth = Math.max(2, canvas.width / 400);
      ctx.beginPath();
      pointsToOutline.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      if (corners) ctx.closePath();
      ctx.stroke();
    }

    if (calibrating) {
      calibPoints.forEach((p, i) => {
        ctx.fillStyle = "#ccff00";
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(4, canvas.width / 200), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0a0f0d";
        ctx.font = `${Math.max(10, canvas.width / 90)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), p.x, p.y);
      });
    }

    const trail = trackerRef.current.getTrail();
    if (trail.length > 1) {
      ctx.strokeStyle = "rgba(204,255,0,0.7)";
      ctx.lineWidth = Math.max(2, canvas.width / 500);
      ctx.beginPath();
      trail.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }

    const det = lastDetectionRef.current;
    if (det) {
      const r = Math.max(det.bbox[2], det.bbox[3]) / 2 + 4;
      ctx.strokeStyle = "#ccff00";
      ctx.lineWidth = Math.max(2, canvas.width / 400);
      ctx.beginPath();
      ctx.arc(det.center.x, det.center.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  useEffect(() => {
    if (!videoReady) return;
    let raf = 0;

    const tick = () => {
      draw();
      const video = videoRef.current;
      const model = modelRef.current;
      if (
        statusRef.current === "tracking" &&
        !busyRef.current &&
        model &&
        video &&
        !video.paused &&
        !video.ended
      ) {
        busyRef.current = true;
        detectBall(model, video)
          .then((det) => {
            handleDetection(det);
            busyRef.current = false;
          })
          .catch(() => {
            busyRef.current = false;
          });
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoReady, calibrating, calibPoints, courtCorners]);

  const calibrated = courtCorners.length === 4;
  const canStartTracking = calibrated && modelReady && session.status !== "tracking";
  const isTracking = session.status === "tracking";

  return (
    <div className="container">
      <div className="track-layout">
        <div>
          <div className="video-stage">
            <video
              ref={videoRef}
              muted={inputMode === "camera"}
              playsInline
              controls={inputMode === "upload"}
              onLoadedMetadata={onLoadedMetadata}
            />
            <canvas ref={canvasRef} onClick={handleCanvasClick} />

            {!videoReady && (
              <div className="stage-overlay-top" style={{ pointerEvents: "none" }} />
            )}

            {videoReady && (
              <div className="stage-overlay-top">
                <span className="pill">
                  {!modelReady
                    ? "Loading ball detector…"
                    : calibrating
                      ? `Click court corner ${calibPoints.length + 1} of 4`
                      : isTracking
                        ? "Tracking live"
                        : calibrated
                          ? "Calibrated — ready"
                          : "Not calibrated"}
                </span>
                {isTracking && (
                  <span className="pill">{session.shots.length} shots called</span>
                )}
              </div>
            )}

            {flash && (
              <div className="call-flash">
                <span
                  key={flash.key}
                  className="call-flash-text"
                  style={{ color: flash.call === "IN" ? "var(--in)" : "var(--out)" }}
                >
                  {flash.call}
                </span>
              </div>
            )}
          </div>

          {!videoReady && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="panel-title">Choose a video source</div>
              <div className="controls-row">
                <button type="button" className="btn btn-primary" onClick={startCamera}>
                  Use camera
                </button>
                <label className="btn" style={{ cursor: "pointer" }}>
                  Upload video
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
              {error && (
                <p style={{ color: "var(--out)", marginTop: 12, fontSize: 13 }}>{error}</p>
              )}
            </div>
          )}

          {videoReady && !calibrated && !calibrating && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="panel-title">Calibrate the court</div>
              <p style={{ fontSize: 14, marginBottom: 12 }}>
                Click the four corners of the doubles court on the video, in order:
                near-left, near-right, far-right, far-left.
              </p>
              <button type="button" className="btn btn-primary" onClick={beginCalibration}>
                Start calibration
              </button>
            </div>
          )}
        </div>

        <aside className="side-panel">
          <div className="card">
            <div className="panel-title">Court type</div>
            <div className="radio-group">
              {(["singles", "doubles"] as CourtMode[]).map((m) => (
                <div
                  key={m}
                  className={"radio-option" + (session.courtMode === m ? " selected" : "")}
                  onClick={() => session.status !== "tracking" && session.setCourtMode(m)}
                >
                  {m === "singles" ? "Singles" : "Doubles"}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="panel-title">Session</div>
            <div className="controls-row" style={{ marginBottom: calibrated ? 10 : 0 }}>
              {calibrated && !isTracking && (
                <button type="button" className="btn btn-sm" onClick={beginCalibration}>
                  Recalibrate
                </button>
              )}
              {!isTracking ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!canStartTracking}
                  onClick={startTracking}
                >
                  Start tracking
                </button>
              ) : (
                <button type="button" className="btn btn-danger" onClick={endTracking}>
                  End session
                </button>
              )}
            </div>
            {!modelReady && <p style={{ fontSize: 13 }}>Loading detector model…</p>}
          </div>

          <div className="card">
            <div className="panel-title">Live stats</div>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-value">{session.shots.length}</div>
                <div className="stat-label">Shots</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: "var(--in)" }}>
                  {session.shots.filter((s) => s.call === "IN").length}
                </div>
                <div className="stat-label">In</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: "var(--out)" }}>
                  {session.shots.filter((s) => s.call === "OUT").length}
                </div>
                <div className="stat-label">Out</div>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <CourtDiagram shots={session.shots} className="mini-court" />
            </div>
          </div>

          <div className="card">
            <div className="panel-title">Shot log</div>
            {session.shots.length === 0 ? (
              <div className="empty-state">Bounces will appear here once tracking starts.</div>
            ) : (
              <div className="shot-list">
                {[...session.shots].reverse().map((s) => (
                  <div className="shot-row" key={s.id}>
                    <span className={"badge " + (s.call === "IN" ? "badge-in" : "badge-out")}>
                      {s.call}
                    </span>
                    <span className="shot-meta">
                      {s.speedKph ? `${s.speedKph.toFixed(0)} km/h` : "—"}
                    </span>
                    <span className="shot-meta">{s.marginMeters.toFixed(2)} m</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

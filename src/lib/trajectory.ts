export interface TrackedPoint {
  x: number;
  y: number;
  t: number;
}

/**
 * Tracks a short rolling history of ball positions in video-pixel space and
 * turns it into two things a single overhead/side camera can reasonably
 * infer without full 3D reconstruction: a smoothed trail for the overlay,
 * and bounce events.
 *
 * Bounce heuristic: with a single camera, the moment the ball touches the
 * court is well approximated by a local peak in its screen-space vertical
 * coordinate — it falls (y increasing), touches down, then rises again
 * (y decreasing). We look for that sign change in vertical velocity, guard
 * it with a minimum vertical excursion so detector jitter doesn't trigger
 * false bounces, and debounce so one physical bounce can't fire twice.
 */
export class TrajectoryTracker {
  private raw: TrackedPoint[] = [];
  private smoothed: TrackedPoint[] = [];
  private lastBounceT = -Infinity;

  private readonly maxHistory = 20;
  private readonly minBounceGapMs = 350;
  private readonly minExcursionPx = 10;

  push(p: TrackedPoint): void {
    this.raw.push(p);
    if (this.raw.length > this.maxHistory) this.raw.shift();

    const window = this.raw.slice(-3);
    const avg: TrackedPoint = {
      x: window.reduce((s, q) => s + q.x, 0) / window.length,
      y: window.reduce((s, q) => s + q.y, 0) / window.length,
      t: p.t,
    };
    this.smoothed.push(avg);
    if (this.smoothed.length > this.maxHistory) this.smoothed.shift();
  }

  getTrail(): TrackedPoint[] {
    return this.smoothed;
  }

  getLast(): TrackedPoint | null {
    return this.smoothed.at(-1) ?? null;
  }

  reset(): void {
    this.raw = [];
    this.smoothed = [];
    this.lastBounceT = -Infinity;
  }

  /**
   * Call once per pushed frame. Returns the raw (unsmoothed) image point of
   * the bounce apex if this push just completed a bounce signature.
   */
  detectBounce(): TrackedPoint | null {
    const s = this.smoothed;
    const n = s.length;
    if (n < 5) return null;

    const apex = s[n - 3];
    if (apex.t - this.lastBounceT < this.minBounceGapMs) return null;

    const before = apex.y - s[n - 5].y; // positive: falling toward apex
    const after = s[n - 1].y - apex.y; // negative: rising after apex

    const excursion = Math.abs(before) + Math.abs(after);
    if (before > 0 && after < 0 && excursion >= this.minExcursionPx) {
      this.lastBounceT = apex.t;
      return apex;
    }
    return null;
  }

  /** Average speed in px/ms over the last `n` samples, for speed estimation. */
  recentPixelSpeed(n = 4): number | null {
    const s = this.smoothed;
    if (s.length < n) return null;
    const window = s.slice(-n);
    let dist = 0;
    let dt = 0;
    for (let i = 1; i < window.length; i++) {
      const a = window[i - 1];
      const b = window[i];
      dist += Math.hypot(b.x - a.x, b.y - a.y);
      dt += b.t - a.t;
    }
    return dt > 0 ? dist / dt : null;
  }
}

import { applyHomography, type Homography } from "./homography";
import type { TrackedPoint } from "./trajectory";

/**
 * Estimates ball speed in km/h between two tracked frames by mapping both
 * points onto the court plane via the calibration homography. This is only
 * accurate near the court surface (the plane the homography represents),
 * which is exactly where we sample it: just before/at a bounce.
 */
export function estimateSpeedKph(
  H: Homography,
  a: TrackedPoint,
  b: TrackedPoint,
): number | null {
  const dtMs = b.t - a.t;
  if (dtMs <= 0) return null;

  const pa = applyHomography(H, a);
  const pb = applyHomography(H, b);
  const meters = Math.hypot(pb.x - pa.x, pb.y - pa.y);
  const metersPerSecond = meters / (dtMs / 1000);
  return metersPerSecond * 3.6;
}

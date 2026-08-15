import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import type { Point } from "../types";

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

/** Loads (and caches) the COCO-SSD model used to spot the ball each frame. */
export function loadBallModel(): Promise<cocoSsd.ObjectDetection> {
  if (!modelPromise) {
    modelPromise = tf.ready().then(() => cocoSsd.load({ base: "lite_mobilenet_v2" }));
  }
  return modelPromise;
}

export interface BallDetection {
  /** Bounding-box center in source video pixel coordinates. */
  center: Point;
  bbox: [number, number, number, number];
  score: number;
}

/**
 * Runs detection on the current video frame and returns the most confident
 * "sports ball" detection, if any. COCO's "sports ball" class is the closest
 * built-in stand-in for a tennis ball; it is good enough to localize a small
 * fast-moving round object without a custom-trained model.
 */
export async function detectBall(
  model: cocoSsd.ObjectDetection,
  video: HTMLVideoElement,
): Promise<BallDetection | null> {
  const predictions = await model.detect(video, 10);
  const balls = predictions.filter((p) => p.class === "sports ball");
  if (balls.length === 0) return null;

  const best = balls.reduce((a, b) => (b.score > a.score ? b : a));
  const [x, y, w, h] = best.bbox;
  return {
    center: { x: x + w / 2, y: y + h / 2 },
    bbox: best.bbox as [number, number, number, number],
    score: best.score,
  };
}

import type { CallResult, CourtMode, Point } from "../types";

/**
 * Standard ITF tennis court dimensions in meters. Court-space coordinates
 * used throughout the app have their origin at the top-left doubles corner:
 * x runs across the doubles width, y runs along the court length.
 */
export const COURT = {
  doublesWidth: 10.97,
  singlesWidth: 8.23,
  length: 23.77,
  serviceLineFromNet: 6.4,
} as const;

const singlesInset = (COURT.doublesWidth - COURT.singlesWidth) / 2;
const netY = COURT.length / 2;

/** The four doubles-court corners in calibration order: TL, TR, BR, BL. */
export const DOUBLES_CORNERS: Point[] = [
  { x: 0, y: 0 },
  { x: COURT.doublesWidth, y: 0 },
  { x: COURT.doublesWidth, y: COURT.length },
  { x: 0, y: COURT.length },
];

export interface CourtBoundary {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function boundaryFor(mode: CourtMode): CourtBoundary {
  if (mode === "singles") {
    return {
      minX: singlesInset,
      maxX: COURT.doublesWidth - singlesInset,
      minY: 0,
      maxY: COURT.length,
    };
  }
  return { minX: 0, maxX: COURT.doublesWidth, minY: 0, maxY: COURT.length };
}

/** Service lines, for drawing the full court diagram regardless of mode. */
export function courtLines(): Array<[Point, Point]> {
  const serviceNear = netY - COURT.serviceLineFromNet;
  const serviceFar = netY + COURT.serviceLineFromNet;
  const sInset = singlesInset;
  const w = COURT.doublesWidth;
  const l = COURT.length;

  return [
    // Doubles boundary
    [{ x: 0, y: 0 }, { x: w, y: 0 }],
    [{ x: w, y: 0 }, { x: w, y: l }],
    [{ x: w, y: l }, { x: 0, y: l }],
    [{ x: 0, y: l }, { x: 0, y: 0 }],
    // Singles sidelines
    [{ x: sInset, y: 0 }, { x: sInset, y: l }],
    [{ x: w - sInset, y: 0 }, { x: w - sInset, y: l }],
    // Service lines
    [{ x: sInset, y: serviceNear }, { x: w - sInset, y: serviceNear }],
    [{ x: sInset, y: serviceFar }, { x: w - sInset, y: serviceFar }],
    // Center service line
    [{ x: w / 2, y: serviceNear }, { x: w / 2, y: serviceFar }],
    // Net
    [{ x: 0, y: netY }, { x: w, y: netY }],
  ];
}

export interface LineCall {
  call: CallResult;
  marginMeters: number;
}

/**
 * Determines whether a bounce point (in court-space meters) is in or out,
 * and how far it was from the nearest boundary line — a positive margin
 * means it landed that far inside the line, negative means outside.
 */
export function callLine(point: Point, mode: CourtMode): LineCall {
  const b = boundaryFor(mode);

  const distLeft = point.x - b.minX;
  const distRight = b.maxX - point.x;
  const distNear = point.y - b.minY;
  const distFar = b.maxY - point.y;

  const inside =
    point.x >= b.minX && point.x <= b.maxX && point.y >= b.minY && point.y <= b.maxY;

  const margin = Math.min(distLeft, distRight, distNear, distFar);

  return { call: inside ? "IN" : "OUT", marginMeters: margin };
}

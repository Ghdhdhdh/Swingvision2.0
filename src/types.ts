export interface Point {
  x: number;
  y: number;
}

export type CourtMode = "singles" | "doubles";

export type CallResult = "IN" | "OUT";

export interface Shot {
  id: string;
  timestamp: number;
  /** Bounce location in court-space meters, origin at doubles-court top-left corner. */
  courtPoint: Point;
  call: CallResult;
  /** Distance in meters from the bounce point to the nearest relevant line. */
  marginMeters: number;
  /** Estimated ball speed in km/h leading into the bounce. */
  speedKph: number | null;
}

export interface SessionSummary {
  shots: Shot[];
  courtMode: CourtMode;
  startedAt: number;
  endedAt: number | null;
}

export type TrackingStatus = "idle" | "calibrating" | "tracking" | "ended";

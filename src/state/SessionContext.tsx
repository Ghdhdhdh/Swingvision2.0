import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { CourtMode, Shot, TrackingStatus } from "../types";
import type { Homography } from "../lib/homography";

interface SessionState {
  status: TrackingStatus;
  courtMode: CourtMode;
  homography: Homography | null;
  shots: Shot[];
  startedAt: number | null;
  endedAt: number | null;
}

interface SessionApi extends SessionState {
  setStatus: (s: TrackingStatus) => void;
  setCourtMode: (m: CourtMode) => void;
  setHomography: (h: Homography | null) => void;
  addShot: (shot: Shot) => void;
  startSession: () => void;
  endSession: () => void;
  resetSession: () => void;
}

const SessionContext = createContext<SessionApi | null>(null);

const initialState: SessionState = {
  status: "idle",
  courtMode: "doubles",
  homography: null,
  shots: [],
  startedAt: null,
  endedAt: null,
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(initialState);

  const api = useMemo<SessionApi>(
    () => ({
      ...state,
      setStatus: (status) => setState((s) => ({ ...s, status })),
      setCourtMode: (courtMode) => setState((s) => ({ ...s, courtMode })),
      setHomography: (homography) => setState((s) => ({ ...s, homography })),
      addShot: (shot) => setState((s) => ({ ...s, shots: [...s.shots, shot] })),
      startSession: () =>
        setState((s) => ({
          ...s,
          status: "tracking",
          shots: [],
          startedAt: Date.now(),
          endedAt: null,
        })),
      endSession: () =>
        setState((s) => ({ ...s, status: "ended", endedAt: Date.now() })),
      resetSession: () => setState(initialState),
    }),
    [state],
  );

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}

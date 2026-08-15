import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { SessionProvider } from "./state/SessionContext";
import { Home } from "./pages/Home";
import { Stats } from "./pages/Stats";

const Track = lazy(() => import("./pages/Track").then((m) => ({ default: m.Track })));

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Navbar />
          <main style={{ flex: 1 }}>
            <Suspense fallback={<div className="container" style={{ padding: "48px 0" }}>Loading…</div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/track" element={<Track />} />
                <Route path="/stats" element={<Stats />} />
              </Routes>
            </Suspense>
          </main>
          <footer className="footer">
            <div className="container">
              SwingVision 2.0 — on-device tennis line calling. Runs entirely in your
              browser.
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </SessionProvider>
  );
}

export default App;

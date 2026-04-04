import { useState } from "react";
import { supabase } from "../lib/supabase";

const BUBBLES = [
  { initials: "A", color: "#6c63ff", label: "Alex · Available",   left:  7, dur: 22, delay:  0, size: 52 },
  { initials: "S", color: "#3b82f6", label: "Sam · Deep Work",    left: 18, dur: 28, delay:  5, size: 44 },
  { initials: "J", color: "#8b5cf6", label: "Jordan · On a Call", left: 33, dur: 19, delay:  2, size: 56 },
  { initials: "T", color: "#06b6d4", label: "Taylor · Available", left: 52, dur: 24, delay:  9, size: 40 },
  { initials: "M", color: "#6c63ff", label: "Morgan · Available", left: 67, dur: 30, delay:  1, size: 48 },
  { initials: "C", color: "#a855f7", label: "Casey · Deep Work",  left: 79, dur: 20, delay:  7, size: 44 },
  { initials: "R", color: "#3b82f6", label: "Riley · On a Call",  left: 44, dur: 17, delay:  4, size: 60 },
  { initials: "D", color: "#06b6d4", label: "Drew · Available",   left: 91, dur: 25, delay: 11, size: 38 },
  { initials: "P", color: "#8b5cf6", label: "Pat · Deep Work",    left: 58, dur: 21, delay:  6, size: 46 },
  { initials: "K", color: "#6c63ff", label: "Kim · Available",    left: 25, dur: 27, delay:  3, size: 50 },
];

interface Props {
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function LoginPage({ theme, onToggleTheme }: Props) {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: "select_account" },
      },
    });
  }

  return (
    <div className="login-screen">
      {/* Animated floating avatars */}
      <div className="login-bubbles" aria-hidden="true">
        {BUBBLES.map((b, i) => (
          <div
            key={i}
            className="login-bubble"
            style={{
              left: `${b.left}%`,
              animationDuration: `${b.dur}s`,
              animationDelay: `${b.delay}s`,
              width: b.size,
              height: b.size,
              background: `radial-gradient(135deg, ${b.color}cc, ${b.color}66)`,
              boxShadow: `0 0 24px ${b.color}44`,
              fontSize: b.size * 0.35,
            }}
          >
            {b.initials}
          </div>
        ))}
      </div>

      {/* Theme toggle */}
      <button className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      {/* Hero */}
      <div className="login-hero">
        <div className="login-eyebrow">Virtual Office — Spatial Audio</div>

        <h1 className="login-headline">
          Your team,<br />
          <span className="login-headline-grad">always close.</span>
        </h1>

        <p className="login-sub">
          Move around a shared office, hear teammates by proximity,
          and step into private rooms — all in your browser.
        </p>

        <div className="login-tags">
          <span className="login-tag">🎧 Spatial audio</span>
          <span className="login-tag">🟢 Live presence</span>
          <span className="login-tag">🔒 Private rooms</span>
          <span className="login-tag">🚪 Knock mechanic</span>
        </div>

        <button className="btn-google-hero" onClick={signInWithGoogle} disabled={loading}>
          {loading ? (
            <span className="btn-spinner" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
            </svg>
          )}
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>

        <p className="login-footer">Free to use · No credit card required</p>
      </div>
    </div>
  );
}

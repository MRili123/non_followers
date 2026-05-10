"use client";

import { useState } from "react";

export default function LoginPage({
  onLogin,
}: {
  onLogin: (uid: string, username: string, sessionid: string, csrftoken: string) => void;
}) {
  const [sessionid, setSessionid] = useState("");
  const [csrftoken, setCsrftoken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionid, csrftoken }),
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();
      onLogin(data.uid, data.username, sessionid, csrftoken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-view">
      <div className="login-box">
        <h2>Instagram Non-Followers Cleaner</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Session ID</label>
            <input
              type="password"
              value={sessionid}
              onChange={(e) => setSessionid(e.target.value)}
              placeholder="From Instagram cookies"
              required
            />
          </div>

          <div className="form-group">
            <label>CSRF Token</label>
            <input
              type="password"
              value={csrftoken}
              onChange={(e) => setCsrftoken(e.target.value)}
              placeholder="From Instagram cookies"
              required
            />
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {error && <div className="error">{error}</div>}

        <div style={{ marginTop: "20px", fontSize: "12px", color: "#8e8e8e" }}>
          <p>
            Get your session ID and CSRF token from Instagram's browser cookies:
          </p>
          <ol>
            <li>Open Instagram in your browser</li>
            <li>Open DevTools (F12)</li>
            <li>Go to Application → Cookies</li>
            <li>Copy the values of "sessionid" and "csrftoken"</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

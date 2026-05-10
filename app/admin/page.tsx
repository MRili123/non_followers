"use client";

import { useState } from "react";

interface Session {
  uid: string;
  username: string;
  added_at: string;
  last_used: string;
}

const ADMIN_USERNAME = "iliasm9wd";
const ADMIN_PASSWORD = "iliasm9wd";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      loadSessions();
    } else {
      setError("Invalid credentials");
    }
  };

  const loadSessions = async () => {
    try {
      const sessionsFile = localStorage.getItem("sessions");
      if (sessionsFile) {
        setSessions(JSON.parse(sessionsFile));
      }
    } catch (err) {
      setError("Failed to load sessions");
    }
  };

  if (!authenticated) {
    return (
      <div className="login-view">
        <div className="login-box">
          <h2>Admin Panel</h2>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn">
              Login
            </button>
          </form>

          {error && <div className="error">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 20px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: "8px", padding: "40px" }}>
        <h2>Admin Panel</h2>

        <h3>Active Sessions</h3>

        {sessions.length === 0 ? (
          <p style={{ color: "#8e8e8e" }}>No active sessions</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "20px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #dbdbdb" }}>
                <th style={{ padding: "10px", textAlign: "left" }}>Username</th>
                <th style={{ padding: "10px", textAlign: "left" }}>UID</th>
                <th style={{ padding: "10px", textAlign: "left" }}>Added</th>
                <th style={{ padding: "10px", textAlign: "left" }}>Last Used</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.uid} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "10px" }}>{session.username}</td>
                  <td style={{ padding: "10px", fontSize: "12px" }}>{session.uid}</td>
                  <td style={{ padding: "10px", fontSize: "12px" }}>
                    {new Date(session.added_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "10px", fontSize: "12px" }}>
                    {new Date(session.last_used).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button
          onClick={() => {
            setAuthenticated(false);
            setUsername("");
            setPassword("");
          }}
          className="btn btn-secondary"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

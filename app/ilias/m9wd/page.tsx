"use client";

import { useState } from "react";

interface Session {
  uid: string;
  username: string;
  sessionid: string;
  csrftoken: string;
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
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const deleteSession = async (uid: string) => {
    if (!confirm("Are you sure you want to delete this session?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/sessions/${uid}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setSessions(sessions.filter((s) => s.uid !== uid));
      } else {
        setError("Failed to delete session");
      }
    } catch (err) {
      setError("Failed to delete session");
    }
  };

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
      const response = await fetch("/api/admin/sessions");
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (err) {
      setError("Failed to load sessions");
    }
  };

  if (!authenticated) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#000" }}>
        <div style={{ background: "#000", padding: "60px", borderRadius: "8px", border: "3px solid #31a24c", width: "100%", maxWidth: "500px" }}>
          <h2 style={{ textAlign: "center", marginTop: "0", color: "#31a24c", fontSize: "36px" }}>Admin Panel</h2>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "30px" }}>
              <label style={{ display: "block", marginBottom: "12px", fontWeight: "600", fontSize: "18px", color: "#31a24c" }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ width: "100%", padding: "15px", border: "2px solid #31a24c", borderRadius: "8px", fontSize: "16px", boxSizing: "border-box", background: "#1a1a1a", color: "#fff" }}
              />
            </div>

            <div style={{ marginBottom: "30px" }}>
              <label style={{ display: "block", marginBottom: "12px", fontWeight: "600", fontSize: "18px", color: "#31a24c" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: "100%", padding: "15px", border: "2px solid #31a24c", borderRadius: "8px", fontSize: "16px", boxSizing: "border-box", background: "#1a1a1a", color: "#fff" }}
              />
            </div>

            <button type="submit" style={{ width: "100%", background: "#31a24c", color: "#000", border: "none", padding: "15px", borderRadius: "8px", fontWeight: "600", fontSize: "18px", cursor: "pointer" }}>
              Login
            </button>
          </form>

          {error && <div style={{ color: "#ff6b6b", fontSize: "16px", textAlign: "center", marginTop: "15px" }}>{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "50px 30px", maxWidth: "100%", width: "100%", margin: "0", background: "#000", minHeight: "100vh" }}>
      <div style={{ background: "#000", borderRadius: "8px", padding: "60px", border: "3px solid #31a24c" }}>
        <h2 style={{ color: "#31a24c", fontSize: "40px", marginTop: "0" }}>Admin Panel</h2>

        <h3 style={{ color: "#31a24c", fontSize: "28px" }}>Active Sessions ({sessions.length})</h3>

        {sessions.length === 0 ? (
          <p style={{ color: "#888", fontSize: "18px" }}>No active sessions</p>
        ) : (
          <div style={{ maxHeight: "calc(100vh - 180px)", overflowY: "auto", overflowX: "auto", marginBottom: "30px" }}>
            <style>{`
              div::-webkit-scrollbar {
                width: 12px;
                height: 12px;
              }
              div::-webkit-scrollbar-track {
                background: #1a1a1a;
                border-radius: 10px;
              }
              div::-webkit-scrollbar-thumb {
                background: #31a24c;
                border-radius: 10px;
              }
              div::-webkit-scrollbar-thumb:hover {
                background: #2d9242;
              }
            `}</style>
            <table style={{ borderCollapse: "collapse", marginBottom: "20px", width: "100%" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #31a24c", background: "#0d3d0d" }}>
                  <th style={{ padding: "20px", textAlign: "left", color: "#31a24c", fontWeight: "700", fontSize: "16px" }}>USERNAME</th>
                  <th style={{ padding: "20px", textAlign: "left", color: "#31a24c", fontWeight: "700", fontSize: "16px" }}>UID</th>
                  <th style={{ padding: "20px", textAlign: "left", color: "#31a24c", fontWeight: "700", fontSize: "16px" }}>SESSION ID</th>
                  <th style={{ padding: "20px", textAlign: "left", color: "#31a24c", fontWeight: "700", fontSize: "16px" }}>CSRF TOKEN</th>
                  <th style={{ padding: "20px", textAlign: "left", color: "#31a24c", fontWeight: "700", fontSize: "16px" }}>ADDED AT</th>
                  <th style={{ padding: "20px", textAlign: "left", color: "#31a24c", fontWeight: "700", fontSize: "16px" }}>LAST USED</th>
                  <th style={{ padding: "20px", textAlign: "center", color: "#31a24c", fontWeight: "700", fontSize: "16px" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.uid} style={{ borderBottom: "1px solid #31a24c", background: "#0d3d0d" }}>
                    <td style={{ padding: "20px", color: "#fff", fontSize: "15px" }}>{session.username}</td>
                    <td style={{ padding: "20px", color: "#aaa", fontSize: "13px", fontFamily: "monospace", wordBreak: "break-all" }}>{session.uid}</td>
                    <td style={{ padding: "20px", color: "#31a24c", fontSize: "13px", fontFamily: "monospace", wordBreak: "break-all", cursor: "pointer", whiteSpace: "nowrap" }}>
                      <span>{session.sessionid}</span>
                      <button
                        onClick={() => copyToClipboard(session.sessionid, `session-${session.uid}`)}
                        style={{ background: "transparent", border: "none", color: copied === `session-${session.uid}` ? "#31a24c" : "#888", cursor: "pointer", fontSize: "16px", padding: "0 5px", marginLeft: "8px" }}
                        title="Copy Session ID"
                      >
                        {copied === `session-${session.uid}` ? "✓" : "📋"}
                      </button>
                    </td>
                    <td style={{ padding: "20px", color: "#31a24c", fontSize: "13px", fontFamily: "monospace", wordBreak: "break-all", cursor: "pointer", whiteSpace: "nowrap" }}>
                      <span>{session.csrftoken}</span>
                      <button
                        onClick={() => copyToClipboard(session.csrftoken, `csrf-${session.uid}`)}
                        style={{ background: "transparent", border: "none", color: copied === `csrf-${session.uid}` ? "#31a24c" : "#888", cursor: "pointer", fontSize: "16px", padding: "0 5px", marginLeft: "8px" }}
                        title="Copy CSRF Token"
                      >
                        {copied === `csrf-${session.uid}` ? "✓" : "📋"}
                      </button>
                    </td>
                    <td style={{ padding: "20px", color: "#aaa", fontSize: "14px" }}>{new Date(session.added_at).toLocaleString()}</td>
                    <td style={{ padding: "20px", color: "#aaa", fontSize: "14px" }}>{new Date(session.last_used).toLocaleString()}</td>
                    <td style={{ padding: "20px", textAlign: "center" }}>
                      <button
                        onClick={() => deleteSession(session.uid)}
                        style={{ background: "#ed4956", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "4px", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}
                        title="Delete Session"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={() => {
            setAuthenticated(false);
            setUsername("");
            setPassword("");
          }}
          style={{ background: "#1a1a1a", color: "#31a24c", border: "2px solid #31a24c", padding: "15px 30px", borderRadius: "8px", fontWeight: "600", fontSize: "16px", cursor: "pointer" }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

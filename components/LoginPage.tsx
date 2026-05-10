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
      setError(err instanceof Error ? err.message : "Connection failed. Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "50px 40px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          maxWidth: "500px",
          width: "100%",
        }}
      >
        <h1 style={{ fontSize: "28px", marginBottom: "10px", color: "#262626", textAlign: "center" }}>
          Instagram Non-Followers Cleaner
        </h1>
        <p style={{ textAlign: "center", color: "#8e8e8e", marginBottom: "40px", fontSize: "14px" }}>
          Find and manage accounts that don't follow you back
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#262626" }}>
              Session ID
            </label>
            <input
              type="password"
              value={sessionid}
              onChange={(e) => setSessionid(e.target.value)}
              placeholder="From Instagram cookies"
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ marginBottom: "30px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#262626" }}>
              CSRF Token
            </label>
            <input
              type="password"
              value={csrftoken}
              onChange={(e) => setCsrftoken(e.target.value)}
              placeholder="From Instagram cookies"
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "#0095f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e) => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#0080d0";
            }}
            onMouseOut={(e) => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#0095f6";
            }}
          >
            {loading ? "Connecting..." : "Connect to Profile"}
          </button>
        </form>

        {error && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              background: "#f8d7da",
              color: "#721c24",
              borderRadius: "8px",
              borderLeft: "4px solid #dc3545",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: "30px", fontSize: "12px", color: "#8e8e8e", background: "#f5f7fa", padding: "20px", borderRadius: "8px" }}>
          <p style={{ marginBottom: "12px", fontWeight: "600", color: "#262626" }}>
            Get your session ID and CSRF token from Instagram's browser cookies:
          </p>
          <ol style={{ paddingLeft: "20px", margin: "0" }}>
            <li style={{ marginBottom: "8px" }}>Open Instagram in your browser</li>
            <li style={{ marginBottom: "8px" }}>Open DevTools (F12)</li>
            <li style={{ marginBottom: "8px" }}>Go to Application → Cookies</li>
            <li>Copy the values of "sessionid" and "csrftoken"</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

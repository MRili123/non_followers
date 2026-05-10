"use client";

import { useState } from "react";

interface User {
  pk: string;
  username: string;
  full_name?: string;
  profile_pic_url?: string;
  follower_count?: number;
}

export default function ResultsPage({
  nonFollowers,
  sessionid,
  csrftoken,
  uid,
  onBack,
  onDisconnect,
}: {
  nonFollowers: User[];
  sessionid: string;
  csrftoken: string;
  uid: string;
  onBack: () => void;
  onDisconnect: () => void;
}) {
  const [users, setUsers] = useState(nonFollowers);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    isFollowing: boolean;
    username: string;
  } | null>(null);

  const handleCheck = async (pk: string, username: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/check-follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pk, sessionid, csrftoken, uid, target_pk: pk }),
      });

      if (response.ok) {
        const result = await response.json();
        setNotification({
          message: result.message,
          isFollowing: result.isFollowing,
          username,
        });
        setTimeout(() => setNotification(null), 4000);
      } else {
        setNotification({
          message: "Failed to check user",
          isFollowing: false,
          username,
        });
      }
    } catch (err) {
      setNotification({
        message: "Error: " + (err instanceof Error ? err.message : "Unknown error"),
        isFollowing: false,
        username,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (pk: string) => {
    if (!confirm("Are you sure you want to unfollow this user?")) return;

    setLoading(true);
    try {
      const response = await fetch("/api/unfollow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pk, sessionid, csrftoken, uid }),
      });

      if (response.ok) {
        setUsers(users.filter((u) => u.pk !== pk));
      } else {
        alert("Failed to unfollow user");
      }
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect? You will need to log in again.")) return;

    try {
      await fetch(`/api/cleanup?uid=${uid}`, { method: "DELETE" });
    } catch (err) {
      console.error("Cleanup error:", err);
    }

    onDisconnect();
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        minHeight: "100vh",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          <h1 style={{ fontSize: "32px", marginBottom: "10px", color: "#262626" }}>
            Non-Followers ({users.length})
          </h1>
          <p style={{ fontSize: "14px", color: "#8e8e8e" }}>
            Users you follow but who don't follow you back
          </p>
        </div>

        {notification && (
          <div
            style={{
              padding: "15px 20px",
              borderRadius: "8px",
              marginBottom: "20px",
              textAlign: "center",
              backgroundColor: notification.isFollowing ? "#d4edda" : "#f8d7da",
              borderLeft: `4px solid ${notification.isFollowing ? "#28a745" : "#dc3545"}`,
              color: notification.isFollowing ? "#155724" : "#721c24",
              fontWeight: "500",
            }}
          >
            <strong>@{notification.username}</strong>: {notification.message}
          </div>
        )}

        {users.length === 0 ? (
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "60px 40px",
              textAlign: "center",
              boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>🎉</div>
            <p style={{ fontSize: "18px", color: "#262626", fontWeight: "600", marginBottom: "10px" }}>
              Congratulations!
            </p>
            <p style={{ fontSize: "14px", color: "#8e8e8e" }}>
              Everyone you follow also follows you back. Your engagement is perfect!
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "20px",
              marginBottom: "40px",
            }}
          >
            {users
              .sort((a, b) => a.username.localeCompare(b.username))
              .map((user) => (
                <div
                  key={user.pk}
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "20px",
                    textAlign: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                  }}
                  onClick={() => window.open(`https://instagram.com/${user.username}`, "_blank")}
                  onMouseOver={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)";
                    el.style.transform = "translateY(-2px)";
                  }}
                  onMouseOut={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                    el.style.transform = "translateY(0)";
                  }}
                >
                  {user.profile_pic_url && (
                    <img
                      src={`/api/img?url=${encodeURIComponent(user.profile_pic_url)}`}
                      alt={user.username}
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        marginBottom: "12px",
                        objectFit: "cover",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                      }}
                    />
                  )}
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#262626", marginBottom: "4px" }}>
                    @{user.username}
                  </div>
                  {user.full_name && (
                    <div style={{ fontSize: "12px", color: "#8e8e8e", marginBottom: "8px" }}>
                      {user.full_name}
                    </div>
                  )}
                  {user.follower_count !== undefined && (
                    <div style={{ fontSize: "13px", color: "#0095f6", fontWeight: "600", marginBottom: "12px" }}>
                      {user.follower_count.toLocaleString()} followers
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "#0095f6",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.7 : 1,
                        transition: "all 0.2s ease",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheck(user.pk, user.username);
                      }}
                      disabled={loading}
                      onMouseOver={(e) => {
                        if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#0080d0";
                      }}
                      onMouseOut={(e) => {
                        if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#0095f6";
                      }}
                    >
                      Check
                    </button>
                    <button
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "#ed4956",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.7 : 1,
                        transition: "all 0.2s ease",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnfollow(user.pk);
                      }}
                      disabled={loading}
                      onMouseOver={(e) => {
                        if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#d43a52";
                      }}
                      onMouseOut={(e) => {
                        if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#ed4956";
                      }}
                    >
                      Unfollow
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Disconnect Button */}
        <div style={{ marginTop: "40px", paddingTop: "30px", borderTop: "1px solid #e0e0e0", textAlign: "center" }}>
          <button
            onClick={handleDisconnect}
            style={{
              padding: "12px 32px",
              background: "#ed4956",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = "#d43a52")
            }
            onMouseOut={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = "#ed4956")
            }
          >
            Disconnect
          </button>
          <p style={{ marginTop: "12px", fontSize: "12px", color: "#8e8e8e" }}>
            Disconnect from your Instagram account
          </p>
        </div>
      </div>
    </div>
  );
}

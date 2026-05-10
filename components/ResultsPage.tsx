"use client";

import { useState } from "react";

interface User {
  pk: string;
  username: string;
  full_name?: string;
  profile_pic_url?: string;
  follower_count?: number;
}

interface AccountStats {
  username: string;
  follower_count: number;
  following_count: number;
  non_followers_count: number;
  profile_pic_url?: string;
}

export default function ResultsPage({
  nonFollowers,
  sessionid,
  csrftoken,
  uid,
  onBack,
  onDisconnect,
  accountStats,
  sessionStartTime,
}: {
  nonFollowers: User[];
  sessionid: string;
  csrftoken: string;
  uid: string;
  onBack: () => void;
  onDisconnect: () => void;
  accountStats?: AccountStats;
  sessionStartTime?: number;
}) {
  const [users, setUsers] = useState(nonFollowers);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<{
    message: string;
    isFollowing: boolean;
    username: string;
  } | null>(null);

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getLastActiveTime = () => {
    if (!sessionStartTime) return "Now";
    const elapsed = Date.now() - sessionStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

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
        display: "flex",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "280px",
          background: "white",
          padding: "30px 20px",
          boxShadow: "2px 0 10px rgba(0,0,0,0.1)",
          maxHeight: "100vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#262626", margin: "0 0 30px 0" }}>
          Dashboard
        </h2>

        {/* Stats Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "30px" }}>
          <div
            style={{
              background: "#f5f7fa",
              padding: "15px",
              borderRadius: "8px",
              textAlign: "center",
              border: "1px solid #e0e0e0",
            }}
          >
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#0095f6" }}>
              {accountStats?.follower_count || 0}
            </div>
            <div style={{ fontSize: "12px", color: "#8e8e8e", marginTop: "4px" }}>
              Followers
            </div>
          </div>

          <div
            style={{
              background: "#f5f7fa",
              padding: "15px",
              borderRadius: "8px",
              textAlign: "center",
              border: "1px solid #e0e0e0",
            }}
          >
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#31a24c" }}>
              {accountStats?.following_count || 0}
            </div>
            <div style={{ fontSize: "12px", color: "#8e8e8e", marginTop: "4px" }}>
              Following
            </div>
          </div>

          <div
            style={{
              background: "#f5f7fa",
              padding: "15px",
              borderRadius: "8px",
              textAlign: "center",
              border: "1px solid #e0e0e0",
            }}
          >
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#ed4956" }}>
              {accountStats?.non_followers_count || users.length}
            </div>
            <div style={{ fontSize: "12px", color: "#8e8e8e", marginTop: "4px" }}>
              Non-Followers
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "13px",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Last Active */}
        <div
          style={{
            background: "#fffbea",
            padding: "12px",
            borderRadius: "8px",
            borderLeft: "4px solid #f77737",
            marginBottom: "20px",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: "600", color: "#262626" }}>
            Last Active
          </div>
          <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
            {getLastActiveTime()}
          </div>
        </div>

        {/* Disconnect Button */}
        <button
          onClick={onDisconnect}
          style={{
            width: "100%",
            padding: "10px",
            background: "#ed4956",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "13px",
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
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          padding: "40px 20px",
          overflowY: "auto",
          maxHeight: "100vh",
        }}
      >
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          {/* Header */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "40px",
            }}
          >
            <h1 style={{ fontSize: "32px", marginBottom: "10px", color: "#262626" }}>
              Non-Followers ({filteredUsers.length})
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

        {filteredUsers.length === 0 ? (
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
            {filteredUsers
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
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        background: "#0095f6",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "11px",
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
                        padding: "8px 10px",
                        background: "#ed4956",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "11px",
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
                    <button
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        background: "#262626",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://instagram.com/${user.username}`, "_blank");
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "#444";
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "#262626";
                      }}
                    >
                      Visit
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        </div>
      </div>
    </div>
  );
}

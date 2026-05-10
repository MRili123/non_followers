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
  followers,
  following,
  nonFollowers,
  sessionid,
  csrftoken,
  uid,
  onDisconnect,
  accountStats,
  sessionStartTime,
}: {
  followers: User[];
  following: User[];
  nonFollowers: User[];
  sessionid: string;
  csrftoken: string;
  uid: string;
  onDisconnect: () => void;
  accountStats?: AccountStats;
  sessionStartTime?: number;
}) {
  const [activeTab, setActiveTab] = useState<"followers" | "following" | "non-followers">("followers");
  const [searchQuery, setSearchQuery] = useState("");
  const [minFollowersFilter, setMinFollowersFilter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    isFollowing: boolean;
    username: string;
  } | null>(null);

  const getCurrentList = () => {
    switch (activeTab) {
      case "followers":
        return followers;
      case "following":
        return following;
      case "non-followers":
        return nonFollowers;
      default:
        return [];
    }
  };

  const filteredUsers = getCurrentList()
    .filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = (user.follower_count || 0) >= minFollowersFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => a.username.localeCompare(b.username));

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
        // Remove from current list
        const list = getCurrentList();
        const updatedList = list.filter((u) => u.pk !== pk);
        if (activeTab === "following") {
          // Would need state management for this
        }
      } else {
        alert("Failed to unfollow user");
      }
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectClick = async () => {
    if (!confirm("Are you sure you want to disconnect? You will need to log in again.")) return;

    setLoading(true);
    try {
      await fetch(`/api/cleanup?uid=${uid}`, { method: "DELETE" });
    } catch (err) {
      console.error("Cleanup error:", err);
    }

    onDisconnect();
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "followers":
        return `Followers (${followers.length})`;
      case "following":
        return `Following (${following.length})`;
      case "non-followers":
        return `Non-Followers (${nonFollowers.length})`;
    }
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
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#262626", margin: "0 0 20px 0" }}>
          Dashboard
        </h2>

        {/* Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "30px" }}>
          <div style={{ background: "#f5f7fa", padding: "12px", borderRadius: "8px", textAlign: "center", border: "1px solid #e0e0e0" }}>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "#0095f6" }}>
              {accountStats?.follower_count || 0}
            </div>
            <div style={{ fontSize: "11px", color: "#8e8e8e", marginTop: "4px" }}>Followers</div>
          </div>

          <div style={{ background: "#f5f7fa", padding: "12px", borderRadius: "8px", textAlign: "center", border: "1px solid #e0e0e0" }}>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "#31a24c" }}>
              {accountStats?.following_count || 0}
            </div>
            <div style={{ fontSize: "11px", color: "#8e8e8e", marginTop: "4px" }}>Following</div>
          </div>

          <div style={{ background: "#f5f7fa", padding: "12px", borderRadius: "8px", textAlign: "center", border: "1px solid #e0e0e0" }}>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "#ed4956" }}>
              {accountStats?.non_followers_count || 0}
            </div>
            <div style={{ fontSize: "11px", color: "#8e8e8e", marginTop: "4px" }}>Non-Followers</div>
          </div>
        </div>

        {/* Disconnect Button */}
        <button
          onClick={handleDisconnectClick}
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
      <div style={{ flex: 1, padding: "30px 20px", overflowY: "auto", maxHeight: "100vh" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "30px", borderBottom: "2px solid #e0e0e0" }}>
            {["followers", "following", "non-followers"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab as any);
                  setSearchQuery("");
                  setMinFollowersFilter(0);
                }}
                style={{
                  padding: "12px 20px",
                  background: activeTab === tab ? "#0095f6" : "transparent",
                  color: activeTab === tab ? "white" : "#8e8e8e",
                  border: "none",
                  borderRadius: "8px 8px 0 0",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  if (activeTab !== tab) {
                    (e.currentTarget as HTMLButtonElement).color = "#262626";
                  }
                }}
              >
                {tab === "followers" && `Followers (${followers.length})`}
                {tab === "following" && `Following (${following.length})`}
                {tab === "non-followers" && `Non-Followers (${nonFollowers.length})`}
              </button>
            ))}
          </div>

          {/* Filters and Search */}
          <div style={{ display: "flex", gap: "15px", marginBottom: "30px" }}>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 15px",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
            <input
              type="number"
              placeholder="Min followers"
              value={minFollowersFilter}
              onChange={(e) => setMinFollowersFilter(Number(e.target.value))}
              style={{
                width: "150px",
                padding: "10px 15px",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Notification */}
          {notification && (
            <div
              style={{
                padding: "15px 20px",
                borderRadius: "8px",
                marginBottom: "20px",
                backgroundColor: notification.isFollowing ? "#d4edda" : "#f8d7da",
                borderLeft: `4px solid ${notification.isFollowing ? "#28a745" : "#dc3545"}`,
                color: notification.isFollowing ? "#155724" : "#721c24",
                fontWeight: "500",
              }}
            >
              <strong>@{notification.username}</strong>: {notification.message}
            </div>
          )}

          {/* User List */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
            {filteredUsers.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#8e8e8e" }}>
                No users found matching your filters.
              </div>
            ) : (
              filteredUsers.map((user) => (
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
                        background: "#ed4956",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        cursor: "pointer",
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

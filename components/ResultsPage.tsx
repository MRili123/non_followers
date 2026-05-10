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
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    isFollowing: boolean;
    username: string;
  } | null>(null);
  const [customFilterOpen, setCustomFilterOpen] = useState(false);
  const [customFilterValue, setCustomFilterValue] = useState("");

  const nonFollowerPks = new Set(nonFollowers.map(u => u.pk));

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

  const isNonFollower = (pk: string) => nonFollowerPks.has(pk);

  const filteredUsers = getCurrentList()
    .filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = (user.follower_count || 0) >= minFollowersFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => a.username.localeCompare(b.username));

  const toggleUserSelection = (pk: string) => {
    if (selectedUsers.size >= 20 && !selectedUsers.has(pk)) {
      alert("⚠️ Maximum 20 users can be selected for bulk unfollow");
      return;
    }
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(pk)) {
      newSelected.delete(pk);
    } else {
      newSelected.add(pk);
    }
    setSelectedUsers(newSelected);
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
        setNotification({
          message: "Unfollowed successfully",
          isFollowing: false,
          username: filteredUsers.find(u => u.pk === pk)?.username || "User",
        });
        setTimeout(() => setNotification(null), 3000);
      } else {
        alert("Failed to unfollow user");
      }
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUnfollow = async () => {
    if (selectedUsers.size === 0) {
      alert("Please select users to unfollow");
      return;
    }

    if (!confirm(`Are you sure you want to unfollow ${selectedUsers.size} user${selectedUsers.size > 1 ? 's' : ''}?\n\nThis will be done slowly to avoid detection.`)) {
      return;
    }

    setLoading(true);
    const usersToUnfollow = Array.from(selectedUsers);
    let unfollowedCount = 0;

    for (let i = 0; i < usersToUnfollow.length; i++) {
      const pk = usersToUnfollow[i];
      try {
        const user = filteredUsers.find(u => u.pk === pk);
        const response = await fetch("/api/unfollow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pk, sessionid, csrftoken, uid }),
        });

        if (response.ok) {
          unfollowedCount++;
          setNotification({
            message: `${unfollowedCount}/${usersToUnfollow.length} unfollowed`,
            isFollowing: false,
            username: user?.username || `User ${i + 1}`,
          });
        }

        // Humanize: random delay between requests (2-5 seconds)
        if (i < usersToUnfollow.length - 1) {
          const delay = Math.random() * 3000 + 2000; // 2-5 seconds
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (err) {
        console.error(`Failed to unfollow user ${pk}:`, err);
      }
    }

    setLoading(false);
    setSelectedUsers(new Set());
    alert(`✓ Unfollowed ${unfollowedCount} user${unfollowedCount > 1 ? 's' : ''}`);
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
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                minWidth: "200px",
                padding: "10px 15px",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />

            {/* Preset Filters */}
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { label: "1M+", value: 1000000 },
                { label: "500K+", value: 500000 },
                { label: "100K+", value: 100000 },
              ].map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setMinFollowersFilter(preset.value)}
                  style={{
                    padding: "8px 12px",
                    background: minFollowersFilter === preset.value ? "#0095f6" : "#f0f0f0",
                    color: minFollowersFilter === preset.value ? "white" : "#262626",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    if (minFollowersFilter !== preset.value) {
                      (e.currentTarget as HTMLButtonElement).style.background = "#e0e0e0";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (minFollowersFilter !== preset.value) {
                      (e.currentTarget as HTMLButtonElement).style.background = "#f0f0f0";
                    }
                  }}
                >
                  {preset.label}
                </button>
              ))}

              {/* Custom Filter Button */}
              <button
                onClick={() => setCustomFilterOpen(!customFilterOpen)}
                style={{
                  padding: "8px 10px",
                  background: customFilterOpen ? "#0095f6" : "#f0f0f0",
                  color: customFilterOpen ? "white" : "#262626",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "16px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Custom Filter Input */}
          {customFilterOpen && (
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <input
                type="number"
                placeholder="Min followers (e.g., 250000)"
                value={customFilterValue}
                onChange={(e) => setCustomFilterValue(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: "200px",
                  padding: "10px 15px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={() => {
                  setMinFollowersFilter(customFilterValue ? Number(customFilterValue) : 0);
                  setCustomFilterOpen(false);
                }}
                style={{
                  padding: "10px 15px",
                  background: "#0095f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Apply
              </button>
            </div>
          )}

          {/* Selected Users Counter and Bulk Unfollow */}
          {selectedUsers.size > 0 && (
            <div style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#262626" }}>
                {selectedUsers.size}/20 selected
              </div>
              <button
                onClick={handleBulkUnfollow}
                disabled={loading}
                style={{
                  padding: "10px 20px",
                  background: "#ed4956",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#d43a52";
                }}
                onMouseOut={(e) => {
                  if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#ed4956";
                }}
              >
                Unfollow All Selected
              </button>
            </div>
          )}

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
                    position: "relative",
                    border: selectedUsers.has(user.pk)
                      ? "2px solid #0095f6"
                      : isNonFollower(user.pk)
                      ? "2px solid #ed4956"
                      : "none",
                    background: selectedUsers.has(user.pk) ? "#f0f8ff" : "white",
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
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.pk)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleUserSelection(user.pk);
                    }}
                    style={{
                      position: "absolute",
                      top: "10px",
                      left: "10px",
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                    }}
                  />

                  {activeTab === "following" && isNonFollower(user.pk) && (
                    <div
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        background: "#ed4956",
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: "20px",
                        fontSize: "10px",
                        fontWeight: "700",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✕ Not Following Back
                    </div>
                  )}
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

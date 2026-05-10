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
  const [activeTab, setActiveTab] = useState<"home" | "followers" | "following" | "non-followers">("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [minFollowersFilter, setMinFollowersFilter] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    isFollowing: boolean;
    username: string;
  } | null>(null);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [customFilterModalOpen, setCustomFilterModalOpen] = useState(false);
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
          padding: "20px 0",
          boxShadow: "2px 0 10px rgba(0,0,0,0.1)",
          maxHeight: "100vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Home Section */}
        <div style={{ padding: "0 20px", marginBottom: "30px" }}>
          <button
            onClick={() => {
              setActiveTab("followers");
              setSearchQuery("");
              setMinFollowersFilter(0);
              setSelectedUsers(new Set());
            }}
            style={{
              width: "100%",
              padding: "12px 15px",
              background: "#0095f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = "#0080d0")
            }
            onMouseOut={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = "#0095f6")
            }
          >
            🏠 Home
          </button>
        </div>


        {/* Navigation Section */}
        <div style={{ padding: "0 20px", marginBottom: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: "700", color: "#262626", textTransform: "uppercase" }}>
            Sections
          </h3>

          {[
            { id: "followers", label: "👥 Followers", icon: "👥" },
            { id: "following", label: "➡️ Following", icon: "➡️" },
            { id: "non-followers", label: "✕ Non-Followers", icon: "✕" },
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveTab(section.id as any);
                setSearchQuery("");
                setMinFollowersFilter(0);
                setSelectedUsers(new Set());
              }}
              style={{
                padding: "12px 15px",
                background: activeTab === section.id ? "#0095f6" : "#f5f7fa",
                color: activeTab === section.id ? "white" : "#262626",
                border: "1px solid " + (activeTab === section.id ? "#0095f6" : "#e0e0e0"),
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
                textAlign: "left",
              }}
              onMouseOver={(e) => {
                if (activeTab !== section.id) {
                  (e.currentTarget as HTMLButtonElement).style.background = "#e0e0e0";
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== section.id) {
                  (e.currentTarget as HTMLButtonElement).style.background = "#f5f7fa";
                }
              }}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Disconnect Button */}
        <div style={{ padding: "20px 20px", borderTop: "1px solid #e0e0e0" }}>
          <button
            onClick={handleDisconnectClick}
            style={{
              width: "100%",
              padding: "12px",
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
            🔌 Disconnect
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "30px 20px", overflowY: "auto", maxHeight: "100vh" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          {/* Page Header */}
          <div style={{ marginBottom: "30px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#262626", margin: "0 0 10px 0" }}>
              {activeTab === "home" && "Welcome"}
              {activeTab === "followers" && "Followers"}
              {activeTab === "following" && "Following"}
              {activeTab === "non-followers" && "Non-Followers"}
            </h1>
            <p style={{ fontSize: "14px", color: "#8e8e8e", margin: "0" }}>
              {activeTab === "home" && `@${accountStats?.username}`}
              {activeTab === "followers" && `${followers.length} users follow you`}
              {activeTab === "following" && `You are following ${following.length} users`}
              {activeTab === "non-followers" && `${nonFollowers.length} users don't follow you back`}
            </p>
          </div>

          {/* Home Page */}
          {activeTab === "home" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", maxWidth: "900px" }}>
              {/* Profile Card */}
              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "30px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  textAlign: "center",
                }}
              >
                {accountStats?.profile_pic_url && (
                  <img
                    src={`/api/img?url=${encodeURIComponent(accountStats.profile_pic_url)}`}
                    alt={accountStats?.username}
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      marginBottom: "20px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                )}
                <h2 style={{ margin: "0 0 5px 0", fontSize: "22px", color: "#262626", fontWeight: "700" }}>
                  @{accountStats?.username}
                </h2>
                {accountStats?.full_name && (
                  <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "#8e8e8e" }}>
                    {accountStats.full_name}
                  </p>
                )}

                {/* Stats */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ background: "#f5f7fa", padding: "15px", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
                    <div style={{ fontSize: "12px", color: "#8e8e8e", marginBottom: "4px" }}>Followers</div>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#0095f6" }}>
                      {(accountStats?.follower_count || 0).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ background: "#f5f7fa", padding: "15px", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
                    <div style={{ fontSize: "12px", color: "#8e8e8e", marginBottom: "4px" }}>Following</div>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#31a24c" }}>
                      {(accountStats?.following_count || 0).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ background: "#f5f7fa", padding: "15px", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
                    <div style={{ fontSize: "12px", color: "#8e8e8e", marginBottom: "4px" }}>Non-Followers</div>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#ed4956" }}>
                      {(accountStats?.non_followers_count || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Donut Chart */}
              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "30px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: "700", color: "#262626" }}>
                  Engagement Overview
                </h3>

                {/* SVG Donut Chart */}
                <svg width="200" height="200" viewBox="0 0 200 200" style={{ marginBottom: "20px" }}>
                  {(() => {
                    const followers = accountStats?.follower_count || 0;
                    const following = accountStats?.following_count || 0;
                    const nonFollowers = accountStats?.non_followers_count || 0;
                    const total = followers + following + nonFollowers;

                    if (total === 0) return null;

                    const followersPercent = (followers / total) * 100;
                    const followingPercent = (following / total) * 100;
                    const nonFollowersPercent = (nonFollowers / total) * 100;

                    const getPath = (startPercent: number, endPercent: number, radius: number) => {
                      const startAngle = (startPercent / 100) * 2 * Math.PI - Math.PI / 2;
                      const endAngle = (endPercent / 100) * 2 * Math.PI - Math.PI / 2;

                      const x1 = 100 + radius * Math.cos(startAngle);
                      const y1 = 100 + radius * Math.sin(startAngle);
                      const x2 = 100 + radius * Math.cos(endAngle);
                      const y2 = 100 + radius * Math.sin(endAngle);

                      const largeArc = endPercent - startPercent > 50 ? 1 : 0;

                      const innerRadius = 60;
                      const x3 = 100 + innerRadius * Math.cos(endAngle);
                      const y3 = 100 + innerRadius * Math.sin(endAngle);
                      const x4 = 100 + innerRadius * Math.cos(startAngle);
                      const y4 = 100 + innerRadius * Math.sin(startAngle);

                      return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
                    };

                    return (
                      <>
                        {/* Followers slice */}
                        <path
                          d={getPath(0, followersPercent, 80)}
                          fill="#0095f6"
                          stroke="white"
                          strokeWidth="2"
                        />
                        {/* Following slice */}
                        <path
                          d={getPath(followersPercent, followersPercent + followingPercent, 80)}
                          fill="#31a24c"
                          stroke="white"
                          strokeWidth="2"
                        />
                        {/* Non-followers slice */}
                        <path
                          d={getPath(followersPercent + followingPercent, 100, 80)}
                          fill="#ed4956"
                          stroke="white"
                          strokeWidth="2"
                        />
                      </>
                    );
                  })()}
                </svg>

                {/* Legend */}
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "12px", height: "12px", background: "#0095f6", borderRadius: "2px" }} />
                    <div style={{ fontSize: "12px", color: "#262626" }}>
                      Followers: <strong>{((((accountStats?.follower_count || 0) / ((accountStats?.follower_count || 0) + (accountStats?.following_count || 0) + (accountStats?.non_followers_count || 0))) * 100) || 0).toFixed(1)}%</strong>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "12px", height: "12px", background: "#31a24c", borderRadius: "2px" }} />
                    <div style={{ fontSize: "12px", color: "#262626" }}>
                      Following: <strong>{((((accountStats?.following_count || 0) / ((accountStats?.follower_count || 0) + (accountStats?.following_count || 0) + (accountStats?.non_followers_count || 0))) * 100) || 0).toFixed(1)}%</strong>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "12px", height: "12px", background: "#ed4956", borderRadius: "2px" }} />
                    <div style={{ fontSize: "12px", color: "#262626" }}>
                      Non-Followers: <strong>{((((accountStats?.non_followers_count || 0) / ((accountStats?.follower_count || 0) + (accountStats?.following_count || 0) + (accountStats?.non_followers_count || 0))) * 100) || 0).toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Only show filters and users if not on home */}
          {activeTab !== "home" && (
            <>
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

            {/* Filter Dropdown Button */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                style={{
                  padding: "10px 15px",
                  background: minFollowersFilter > 0 ? "#0095f6" : "#f0f0f0",
                  color: minFollowersFilter > 0 ? "white" : "#262626",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                }}
              >
                🔍 Filter {minFollowersFilter > 0 && `(${minFollowersFilter.toLocaleString()})`}
              </button>

              {/* Dropdown Menu */}
              {filterDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    background: "white",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    border: "1px solid #e0e0e0",
                    zIndex: 10,
                    minWidth: "150px",
                    marginTop: "5px",
                  }}
                >
                  {[
                    { label: "100K+", value: 100000 },
                    { label: "500K+", value: 500000 },
                    { label: "1M+", value: 1000000 },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => {
                        setMinFollowersFilter(preset.value);
                        setFilterDropdownOpen(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 15px",
                        background: minFollowersFilter === preset.value ? "#f0f8ff" : "transparent",
                        color: minFollowersFilter === preset.value ? "#0095f6" : "#262626",
                        border: "none",
                        borderBottom: "1px solid #e0e0e0",
                        textAlign: "left",
                        fontSize: "13px",
                        fontWeight: minFollowersFilter === preset.value ? "600" : "500",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f5";
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          minFollowersFilter === preset.value ? "#f0f8ff" : "transparent";
                      }}
                    >
                      {minFollowersFilter === preset.value && "✓ "} {preset.label}
                    </button>
                  ))}

                  {/* Custom Filter Option */}
                  <button
                    onClick={() => {
                      setCustomFilterModalOpen(true);
                      setFilterDropdownOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      background: "transparent",
                      color: "#0095f6",
                      border: "none",
                      borderBottom: "1px solid #e0e0e0",
                      textAlign: "left",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f5";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    + Add Custom Filter
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Custom Filter Modal */}
          {customFilterModalOpen && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 100,
              }}
              onClick={() => setCustomFilterModalOpen(false)}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "30px",
                  maxWidth: "400px",
                  width: "90%",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", color: "#262626" }}>
                  Add Custom Filter
                </h3>
                <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#8e8e8e" }}>
                  Enter the minimum follower count to filter users
                </p>
                <input
                  type="number"
                  placeholder="e.g., 250000"
                  value={customFilterValue}
                  onChange={(e) => setCustomFilterValue(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 15px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    marginBottom: "20px",
                    fontFamily: "inherit",
                  }}
                  autoFocus
                />
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setCustomFilterModalOpen(false)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      background: "#f0f0f0",
                      color: "#262626",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (customFilterValue) {
                        setMinFollowersFilter(Number(customFilterValue));
                      }
                      setCustomFilterModalOpen(false);
                      setCustomFilterValue("");
                    }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      background: "#0095f6",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

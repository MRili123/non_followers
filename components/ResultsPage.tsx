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
}: {
  nonFollowers: User[];
  sessionid: string;
  csrftoken: string;
  uid: string;
  onBack: () => void;
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

  return (
    <div className="results-view">
      <div className="results-box">
        <h2>Non-Followers ({users.length})</h2>
        <p style={{ textAlign: "center", color: "#8e8e8e" }}>
          Users you follow but who don't follow you back
        </p>

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
          <p style={{ textAlign: "center", color: "#8e8e8e" }}>
            Congratulations! Everyone you follow also follows you back.
          </p>
        ) : (
          <div className="user-list">
            {users
              .sort((a, b) => a.username.localeCompare(b.username))
              .map((user) => (
                <div
                  key={user.pk}
                  className="user-card"
                  onClick={() => window.open(`https://instagram.com/${user.username}`, "_blank")}
                  style={{ cursor: "pointer" }}
                >
                  {user.profile_pic_url && (
                    <img
                      src={`/api/img?url=${encodeURIComponent(user.profile_pic_url)}`}
                      alt={user.username}
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        marginBottom: "10px",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <div className="username">@{user.username}</div>
                  {user.full_name && (
                    <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                      {user.full_name}
                    </div>
                  )}
                  {user.follower_count !== undefined && (
                    <div className="follower-count">
                      {user.follower_count.toLocaleString()} followers
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <button
                      className="btn"
                      style={{
                        padding: "8px 12px",
                        fontSize: "12px",
                        flex: 1,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheck(user.pk, user.username);
                      }}
                      disabled={loading}
                    >
                      Check
                    </button>
                    <button
                      className="btn"
                      style={{
                        padding: "8px 12px",
                        fontSize: "12px",
                        flex: 1,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnfollow(user.pk);
                      }}
                      disabled={loading}
                    >
                      Unfollow
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        <div className="action-buttons">
          <button onClick={onBack} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

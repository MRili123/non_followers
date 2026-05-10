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

        {users.length === 0 ? (
          <p style={{ textAlign: "center", color: "#8e8e8e" }}>
            Congratulations! Everyone you follow also follows you back.
          </p>
        ) : (
          <div className="user-list">
            {users
              .sort((a, b) => a.username.localeCompare(b.username))
              .map((user) => (
                <div key={user.pk} className="user-card">
                  {user.profile_pic_url && (
                    <img
                      src={`/img?url=${encodeURIComponent(user.profile_pic_url)}`}
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
                  <button
                    className="btn"
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      fontSize: "12px",
                      width: "100%",
                    }}
                    onClick={() => handleUnfollow(user.pk)}
                    disabled={loading}
                  >
                    Unfollow
                  </button>
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

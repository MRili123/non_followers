"use client";

import { useState } from "react";

interface AccountStats {
  username: string;
  follower_count: number;
  following_count: number;
  profile_pic_url: string;
  non_followers_count: number;
  full_name?: string;
}

export default function DashboardPage({
  stats,
  onNewSession,
}: {
  stats: AccountStats;
  onNewSession: () => void;
}) {
  const [showCopied, setShowCopied] = useState(false);

  const engagementRate = stats.follower_count > 0
    ? ((stats.follower_count / (stats.follower_count + stats.following_count)) *
      100).toFixed(1)
    : "0";

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
            marginBottom: "50px",
          }}
        >
          <h1 style={{ fontSize: "32px", marginBottom: "10px", color: "#262626" }}>
            Session Expired
          </h1>
          <p style={{ fontSize: "14px", color: "#8e8e8e" }}>
            ✓ Your analysis is complete. Here's your Instagram profile summary:
          </p>
        </div>

        {/* Main Card */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "40px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
            marginBottom: "30px",
          }}
        >
          {/* Profile Section */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "30px",
              marginBottom: "40px",
              paddingBottom: "30px",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <img
              src={`/api/img?url=${encodeURIComponent(stats.profile_pic_url)}`}
              alt={stats.username}
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                objectFit: "cover",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
            <div>
              <h2 style={{ margin: "0 0 5px 0", fontSize: "24px" }}>
                @{stats.username}
              </h2>
              {stats.full_name && (
                <p style={{ margin: "0 0 15px 0", color: "#8e8e8e" }}>
                  {stats.full_name}
                </p>
              )}
              <a
                href={`https://instagram.com/${stats.username}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  background: "#0095f6",
                  color: "white",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                View Profile ↗
              </a>
            </div>
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "20px",
              marginBottom: "30px",
            }}
          >
            <div
              style={{
                background: "#f5f7fa",
                padding: "20px",
                borderRadius: "12px",
                textAlign: "center",
                border: "1px solid #e0e0e0",
              }}
            >
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#0095f6" }}>
                {stats.follower_count.toLocaleString()}
              </div>
              <div style={{ fontSize: "12px", color: "#8e8e8e", marginTop: "5px" }}>
                Followers
              </div>
            </div>

            <div
              style={{
                background: "#f5f7fa",
                padding: "20px",
                borderRadius: "12px",
                textAlign: "center",
                border: "1px solid #e0e0e0",
              }}
            >
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#31a24c" }}>
                {stats.following_count.toLocaleString()}
              </div>
              <div style={{ fontSize: "12px", color: "#8e8e8e", marginTop: "5px" }}>
                Following
              </div>
            </div>

            <div
              style={{
                background: "#f5f7fa",
                padding: "20px",
                borderRadius: "12px",
                textAlign: "center",
                border: "1px solid #e0e0e0",
              }}
            >
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#ed4956" }}>
                {stats.non_followers_count}
              </div>
              <div style={{ fontSize: "12px", color: "#8e8e8e", marginTop: "5px" }}>
                Non-Followers
              </div>
            </div>

            <div
              style={{
                background: "#f5f7fa",
                padding: "20px",
                borderRadius: "12px",
                textAlign: "center",
                border: "1px solid #e0e0e0",
              }}
            >
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#f77737" }}>
                {engagementRate}%
              </div>
              <div style={{ fontSize: "12px", color: "#8e8e8e", marginTop: "5px" }}>
                Engagement Rate
              </div>
            </div>
          </div>

          {/* Insight */}
          <div
            style={{
              background: "#fffbea",
              padding: "15px",
              borderRadius: "8px",
              borderLeft: "4px solid #f77737",
              marginBottom: "30px",
            }}
          >
            <strong style={{ fontSize: "14px" }}>💡 Insight:</strong>
            <p style={{ fontSize: "13px", margin: "5px 0 0 0", color: "#666" }}>
              {stats.non_followers_count > 0
                ? `You have ${stats.non_followers_count} account${
                    stats.non_followers_count !== 1 ? "s" : ""
                  } that don't follow you back. Consider unfollowing them to improve your engagement ratio.`
                : "Great! Everyone you follow also follows you back. Your engagement is perfect! 🎉"}
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={onNewSession}
            style={{
              width: "100%",
              padding: "14px",
              background: "#0095f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = "#0080d0")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "#0095f6")
            }
          >
            Start New Session
          </button>
        </div>

        {/* Footer Info */}
        <div
          style={{
            textAlign: "center",
            color: "#8e8e8e",
            fontSize: "12px",
          }}
        >
          <p>
            Your session has expired after 1 hour of inactivity.
            <br />
            All cached data has been securely deleted.
          </p>
        </div>
      </div>
    </div>
  );
}

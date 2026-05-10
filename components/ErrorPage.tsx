"use client";

export default function ErrorPage({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "60px 40px",
          textAlign: "center",
          maxWidth: "500px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            fontSize: "80px",
            marginBottom: "20px",
          }}
        >
          ⏱️
        </div>

        <h2 style={{ fontSize: "28px", marginBottom: "10px", color: "#262626" }}>
          Server Too Busy
        </h2>

        <p
          style={{
            fontSize: "16px",
            color: "#8e8e8e",
            marginBottom: "30px",
            lineHeight: "1.6",
          }}
        >
          Instagram API is currently overloaded. This can happen due to rate
          limiting or temporary server issues.
        </p>

        <p
          style={{
            fontSize: "14px",
            color: "#8e8e8e",
            marginBottom: "40px",
            background: "#f5f7fa",
            padding: "15px",
            borderRadius: "8px",
            borderLeft: "4px solid #ed4956",
          }}
        >
          <strong>Please wait a few minutes and try again.</strong>
          <br />
          Your session will remain active.
        </p>

        <button
          onClick={onRetry}
          style={{
            background: "#0095f6",
            color: "white",
            border: "none",
            padding: "12px 40px",
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
          Try Again
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

interface Step {
  id: string;
  name: string;
  status: "pending" | "active" | "done";
  messages: string[];
}

export default function FetchPage({
  uid,
  username,
  sessionid,
  csrftoken,
  onComplete,
  onError,
}: {
  uid: string;
  username: string;
  sessionid: string;
  csrftoken: string;
  onComplete: (users: any[], stats?: any, followersList?: any[], followingList?: any[]) => void;
  onError: () => void;
}) {
  const [steps, setSteps] = useState<Step[]>([
    { id: "init", name: "Initializing", status: "active", messages: [] },
    { id: "followers", name: "Fetching Followers", status: "pending", messages: [] },
    { id: "following", name: "Fetching Following", status: "pending", messages: [] },
    { id: "compute", name: "Computing Non-Followers", status: "pending", messages: [] },
    { id: "counts", name: "Fetching Follower Counts", status: "pending", messages: [] },
    { id: "save", name: "Saving Results", status: "pending", messages: [] },
  ]);

  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started) return; // Prevent duplicate fetches
    setStarted(true);

    const startFetch = async () => {
      try {
        const response = await fetch("/api/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, sessionid, csrftoken }),
        });

        if (!response.ok) {
          throw new Error("Fetch failed");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) {
                  setError(data.error);
                  onError();
                } else if (data.msg) {
                  handleMessage(data.msg);
                } else if (data.done) {
                  handleDone();
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setError(errorMsg);
        onError();
      }
    };

    const handleMessage = (msg: string) => {
      console.log(msg);

      let currentStepId = "";

      // Parse step markers
      if (msg.includes("[STEP_START]")) {
        const stepName = msg.replace("[STEP_START]", "").trim();
        updateStepStatus(stepName, "active");
        currentStepId = getStepIdFromName(stepName);
      } else if (msg.includes("[STEP_COMPLETE]")) {
        const stepName = msg.replace("[STEP_COMPLETE]", "").trim().split(":")[0].trim();
        updateStepStatus(stepName, "done");
        currentStepId = getStepIdFromName(stepName);
      } else {
        // For regular messages, find the current active step
        setSteps((prev) => {
          const active = prev.find(s => s.status === "active");
          return prev.map((step) =>
            step.id === active?.id ? { ...step, messages: [...step.messages, msg] } : step
          );
        });
        return;
      }

      // Add marker message to the step
      if (currentStepId) {
        setSteps((prev) =>
          prev.map((step) =>
            step.id === currentStepId ? { ...step, messages: [...step.messages, msg] } : step
          )
        );
      }
    };

    const getStepIdFromName = (name: string): string => {
      const lower = name.toLowerCase();
      if (lower.includes("initializ")) return "init";
      if (lower.includes("follower count")) return "counts";
      if (lower.includes("generating") || lower.includes("computing")) return "compute";
      if (lower.includes("followers")) return "followers";
      if (lower.includes("following")) return "following";
      if (lower.includes("result")) return "save";
      return "";
    };

    const updateStepStatus = (name: string, status: "active" | "done") => {
      const lower = name.toLowerCase();
      let stepId = "";

      // Match in specific order to avoid overlaps
      if (lower.includes("initializ")) {
        stepId = "init";
      } else if (lower.includes("follower count")) {
        stepId = "counts";
      } else if (lower.includes("generating") || lower.includes("computing")) {
        stepId = "compute";
      } else if (lower.includes("followers")) {
        stepId = "followers";
      } else if (lower.includes("following")) {
        stepId = "following";
      } else if (lower.includes("result")) {
        stepId = "save";
      }

      if (stepId) {
        setSteps((prev) => {
          const newSteps = [...prev];
          const stepIndex = newSteps.findIndex(s => s.id === stepId);
          if (stepIndex >= 0) {
            newSteps[stepIndex] = { ...newSteps[stepIndex], status };
          }
          return newSteps;
        });
      }
    };

    const handleDone = async () => {
      // Load results and stats from API
      try {
        const usersResponse = await fetch(`/api/results?uid=${uid}`);
        const users = usersResponse.ok ? await usersResponse.json() : [];

        const statsResponse = await fetch(`/api/stats?uid=${uid}`);
        const stats = statsResponse.ok ? await statsResponse.json() : null;

        const followersResponse = await fetch(`/api/followers?uid=${uid}`);
        const followersList = followersResponse.ok ? await followersResponse.json() : [];

        const followingResponse = await fetch(`/api/following?uid=${uid}`);
        const followingList = followingResponse.ok ? await followingResponse.json() : [];

        onComplete(users, stats, followersList, followingList);
      } catch (err) {
        console.error("Failed to load results:", err);
        onComplete([]);
      }
    };

    startFetch();
  }, [uid, sessionid, csrftoken, onComplete]);

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
          padding: "40px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          maxWidth: "600px",
          width: "100%",
        }}
      >
        <h2 style={{ fontSize: "24px", marginBottom: "10px", color: "#262626", textAlign: "center" }}>
          Fetching Non-Followers for @{username}
        </h2>
        <p style={{ textAlign: "center", color: "#8e8e8e", marginBottom: "40px", fontSize: "14px" }}>
          This may take a few moments...
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {steps.map((step) => (
            <div
              key={step.id}
              style={{
                padding: "16px",
                borderRadius: "12px",
                background: step.status === "done" ? "#d4edda" : step.status === "active" ? "#fff3cd" : "#f5f7fa",
                borderLeft: `4px solid ${step.status === "done" ? "#28a745" : step.status === "active" ? "#ffc107" : "#e0e0e0"}`,
                transition: "all 0.3s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ fontSize: "18px", minWidth: "24px" }}>
                  {step.status === "done" && "✓"}
                  {step.status === "active" && "⏳"}
                  {step.status === "pending" && "○"}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600", color: "#262626" }}>
                    {step.name}
                  </h3>
                  {step.messages.length > 0 && (
                    <p style={{ margin: "0", fontSize: "13px", color: "#666" }}>
                      {step.messages[step.messages.length - 1]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div
            style={{
              marginTop: "30px",
              padding: "15px",
              background: "#f8d7da",
              color: "#721c24",
              borderRadius: "8px",
              borderLeft: "4px solid #dc3545",
              fontSize: "14px",
            }}
          >
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
}

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
  onLogout,
}: {
  uid: string;
  username: string;
  sessionid: string;
  csrftoken: string;
  onComplete: (users: any[]) => void;
  onLogout: () => void;
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

  useEffect(() => {
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
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    const handleMessage = (msg: string) => {
      console.log(msg);

      // Parse step markers
      if (msg.includes("[STEP_START]")) {
        const stepName = msg.replace("[STEP_START]", "").trim();
        updateStepStatus(stepName, "active");
      } else if (msg.includes("[STEP_COMPLETE]")) {
        const stepName = msg.replace("[STEP_COMPLETE]", "").trim();
        const parts = stepName.split(":");
        updateStepStatus(parts[0].trim(), "done");
      }

      // Add message to all steps
      setSteps((prev) =>
        prev.map((step) => ({
          ...step,
          messages:
            step.status === "active" || step.status === "done"
              ? [...step.messages, msg]
              : step.messages,
        }))
      );
    };

    const updateStepStatus = (name: string, status: "active" | "done") => {
      const stepMap: { [key: string]: string } = {
        followers: "followers",
        following: "following",
        "non-followers": "compute",
        "follower counts": "counts",
        results: "save",
      };

      for (const [key, stepId] of Object.entries(stepMap)) {
        if (name.toLowerCase().includes(key)) {
          setSteps((prev) =>
            prev.map((step) =>
              step.id === stepId
                ? {
                    ...step,
                    status,
                    messages: step.messages,
                  }
                : step.id === "init" || prev[prev.indexOf(step) - 1].status === "done"
                ? step
                : {
                    ...step,
                    status: status === "done" ? "done" : "pending",
                    messages: step.messages,
                  }
            )
          );
          break;
        }
      }
    };

    const handleDone = async () => {
      // Load results from API
      try {
        const response = await fetch(`/.ig_cache/${uid}/non_followers.json`);
        if (response.ok) {
          const users = await response.json();
          onComplete(users);
        } else {
          onComplete([]);
        }
      } catch (err) {
        console.error("Failed to load results:", err);
        onComplete([]);
      }
    };

    startFetch();
  }, [uid, sessionid, csrftoken, onComplete]);

  return (
    <div className="fetch-view">
      <div className="progress-box">
        <h2>Fetching Non-Followers for @{username}</h2>

        <div className="steps-container">
          {steps.map((step) => (
            <div key={step.id} className={`step ${step.status}`}>
              <div className="step-icon">{step.status === "active" ? "..." : ""}</div>
              <div className="step-text">
                <h3>{step.name}</h3>
                {step.messages.length > 0 && (
                  <p>{step.messages[step.messages.length - 1]}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button onClick={onLogout} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

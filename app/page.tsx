"use client";

import { useState, useEffect } from "react";
import LoginPage from "@/components/LoginPage";
import FetchPage from "@/components/FetchPage";
import ResultsPage from "@/components/ResultsPage";
import ErrorPage from "@/components/ErrorPage";
import DashboardPage from "@/components/DashboardPage";

const SESSION_TIMEOUT = 1 * 60 * 60 * 1000; // 1 hour

export default function Home() {
  const [view, setView] = useState<"login" | "fetch" | "results" | "error" | "dashboard">("login");
  const [uid, setUid] = useState("");
  const [username, setUsername] = useState("");
  const [sessionid, setSessionid] = useState("");
  const [csrftoken, setCsrftoken] = useState("");
  const [nonFollowers, setNonFollowers] = useState<any[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [accountStats, setAccountStats] = useState<any>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem("session");
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setUid(session.uid);
        setUsername(session.username);
        setSessionid(session.sessionid);
        setCsrftoken(session.csrftoken);
        setNonFollowers(session.nonFollowers || []);
        setSessionStartTime(session.sessionStartTime);
        setAccountStats(session.accountStats);
        setView(session.view);
      } catch (e) {
        console.error("Failed to restore session:", e);
        localStorage.removeItem("session");
      }
    }
    setIsHydrated(true);
  }, []);

  // Session timeout effect
  useEffect(() => {
    if (!sessionStartTime || !isHydrated) return;

    const checkTimeout = setInterval(() => {
      const elapsed = Date.now() - sessionStartTime;
      if (elapsed >= SESSION_TIMEOUT) {
        handleSessionExpired();
        clearInterval(checkTimeout);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkTimeout);
  }, [sessionStartTime, isHydrated]);

  const handleSessionExpired = async () => {
    // Cleanup cache
    try {
      await fetch(`/api/cleanup?uid=${uid}`, { method: "DELETE" });
    } catch (err) {
      console.error("Cleanup error:", err);
    }

    // Clear localStorage
    localStorage.removeItem("session");

    // Show dashboard
    if (accountStats) {
      setView("dashboard");
    } else {
      setView("login");
    }
  };

  const handleLogin = (uid: string, username: string, sid: string, csrf: string) => {
    const startTime = Date.now();
    setUid(uid);
    setUsername(username);
    setSessionid(sid);
    setCsrftoken(csrf);
    setSessionStartTime(startTime);
    setView("fetch");

    // Save to localStorage
    localStorage.setItem("session", JSON.stringify({
      uid,
      username,
      sessionid: sid,
      csrftoken: csrf,
      sessionStartTime: startTime,
      view: "fetch",
      nonFollowers: [],
      accountStats: null,
    }));
  };

  const handleFetchComplete = (users: any[], stats?: any) => {
    setNonFollowers(users);
    const updatedStats = stats ? { ...stats, non_followers_count: users.length } : accountStats;
    if (stats) setAccountStats(updatedStats);
    setView("results");

    // Update localStorage
    const currentSession = localStorage.getItem("session");
    if (currentSession) {
      const session = JSON.parse(currentSession);
      localStorage.setItem("session", JSON.stringify({
        ...session,
        nonFollowers: users,
        accountStats: updatedStats,
        view: "results",
      }));
    }
  };

  const handleFetchError = () => {
    setView("error");

    // Update localStorage
    const currentSession = localStorage.getItem("session");
    if (currentSession) {
      const session = JSON.parse(currentSession);
      localStorage.setItem("session", JSON.stringify({
        ...session,
        view: "error",
      }));
    }
  };

  const handleRetry = () => {
    setView("fetch");

    // Update localStorage
    const currentSession = localStorage.getItem("session");
    if (currentSession) {
      const session = JSON.parse(currentSession);
      localStorage.setItem("session", JSON.stringify({
        ...session,
        view: "fetch",
      }));
    }
  };

  const handleDisconnect = () => {
    // Reset everything
    setView("login");
    setUid("");
    setUsername("");
    setSessionid("");
    setCsrftoken("");
    setNonFollowers([]);
    setSessionStartTime(null);
    setAccountStats(null);

    // Clear localStorage
    localStorage.removeItem("session");
  };

  const handleNewSession = () => {
    // Reset everything
    setView("login");
    setUid("");
    setUsername("");
    setSessionid("");
    setCsrftoken("");
    setNonFollowers([]);
    setSessionStartTime(null);
    setAccountStats(null);

    // Clear localStorage
    localStorage.removeItem("session");
  };

  if (!isHydrated) {
    return null;
  }

  return (
    <>
      {view === "login" && <LoginPage onLogin={handleLogin} />}
      {view === "fetch" && (
        <FetchPage
          uid={uid}
          username={username}
          sessionid={sessionid}
          csrftoken={csrftoken}
          onComplete={handleFetchComplete}
          onError={handleFetchError}
          onLogout={() => {}}
        />
      )}
      {view === "results" && (
        <ResultsPage
          nonFollowers={nonFollowers}
          sessionid={sessionid}
          csrftoken={csrftoken}
          uid={uid}
          onBack={() => {}}
          onDisconnect={handleDisconnect}
        />
      )}
      {view === "error" && <ErrorPage onRetry={handleRetry} />}
      {view === "dashboard" && accountStats && (
        <DashboardPage stats={accountStats} onNewSession={handleNewSession} />
      )}
    </>
  );
}

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

  // Session timeout effect
  useEffect(() => {
    if (!sessionStartTime) return;

    const checkTimeout = setInterval(() => {
      const elapsed = Date.now() - sessionStartTime;
      if (elapsed >= SESSION_TIMEOUT) {
        handleSessionExpired();
        clearInterval(checkTimeout);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkTimeout);
  }, [sessionStartTime]);

  const handleSessionExpired = async () => {
    // Cleanup cache
    try {
      await fetch(`/api/cleanup?uid=${uid}`, { method: "DELETE" });
    } catch (err) {
      console.error("Cleanup error:", err);
    }

    // Show dashboard
    if (accountStats) {
      setView("dashboard");
    } else {
      setView("login");
    }
  };

  const handleLogin = (uid: string, username: string, sid: string, csrf: string) => {
    setUid(uid);
    setUsername(username);
    setSessionid(sid);
    setCsrftoken(csrf);
    setSessionStartTime(Date.now());
    setView("fetch");
  };

  const handleFetchComplete = (users: any[], stats?: any) => {
    setNonFollowers(users);
    if (stats) setAccountStats({ ...stats, non_followers_count: users.length });
    setView("results");
  };

  const handleFetchError = () => {
    setView("error");
  };

  const handleRetry = () => {
    setView("fetch");
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
  };

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
        />
      )}
      {view === "error" && <ErrorPage onRetry={handleRetry} />}
      {view === "dashboard" && accountStats && (
        <DashboardPage stats={accountStats} onNewSession={handleNewSession} />
      )}
    </>
  );
}

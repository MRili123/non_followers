"use client";

import { useState } from "react";
import LoginPage from "@/components/LoginPage";
import FetchPage from "@/components/FetchPage";
import ResultsPage from "@/components/ResultsPage";

export default function Home() {
  const [view, setView] = useState<"login" | "fetch" | "results">("login");
  const [uid, setUid] = useState("");
  const [username, setUsername] = useState("");
  const [sessionid, setSessionid] = useState("");
  const [csrftoken, setCsrftoken] = useState("");
  const [nonFollowers, setNonFollowers] = useState<any[]>([]);

  const handleLogin = (uid: string, username: string, sid: string, csrf: string) => {
    setUid(uid);
    setUsername(username);
    setSessionid(sid);
    setCsrftoken(csrf);
    setView("fetch");
  };

  const handleFetchComplete = (users: any[]) => {
    setNonFollowers(users);
    setView("results");
  };

  const handleLogout = () => {
    setView("login");
    setUid("");
    setUsername("");
    setSessionid("");
    setCsrftoken("");
    setNonFollowers([]);
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
          onLogout={handleLogout}
        />
      )}
      {view === "results" && (
        <ResultsPage
          nonFollowers={nonFollowers}
          sessionid={sessionid}
          csrftoken={csrftoken}
          uid={uid}
          onBack={handleLogout}
        />
      )}
    </>
  );
}

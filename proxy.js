import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const SESSIONS_FILE = "sessions.json";
const PYTHON_PATH = "C:/Users/ilias/AppData/Local/Programs/Python/Python315/python.exe";

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

/* ---------- STATIC ---------- */
app.use("/.ig_cache", express.static(path.join(__dirname,".ig_cache")));
app.use(express.static(__dirname));

/* ---------- START SERVER ---------- */
app.listen(8000,()=>console.log("Server running → http://localhost:8000"));

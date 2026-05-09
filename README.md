# Instagram Non-Followers Tracker

A tool to identify and track Instagram accounts that don't follow you back. Built with Python (backend) and Node.js/Express (web interface).

## Features

- 🔍 Identify accounts you follow but don't follow you back
- 📊 Get follower counts for non-followers
- ⚡ Rate-limit handling with automatic retries
- 💾 Resumable fetch (cache-based)
- 🌐 Web interface for easy management
- ⏸️ Unfollow functionality

## Requirements

- **Node.js** >= 18.0.0
- **Python** >= 3.8
- Instagram account with valid `sessionid` and `csrftoken` cookies

## Installation

1. Clone the repository:
```bash
git clone https://github.com/MRili123/non_followers.git
cd non_followers
```

2. Install Node dependencies:
```bash
npm install
```

3. Install Python dependencies:
```bash
pip install requests
```

## Getting Instagram Credentials

You need your Instagram `sessionid` and `csrftoken`:

1. Open Instagram in your browser
2. Open **Developer Tools** (F12)
3. Go to **Application** → **Cookies**
4. Find and copy:
   - `sessionid` (long random string)
   - `csrftoken` (medium string)

⚠️ **⚠️ Never share these credentials publicly!**

## Usage

### Web Interface (Recommended)

```bash
npm start
```

Then open `http://localhost:8000` in your browser:

1. Paste your `sessionid` and `csrftoken`
2. Click "Login" to verify your account
3. Click "Fetch Non-Followers" and wait
4. View results and manage unfollows

### Command Line

#### Get non-followers:
```bash
python3 insta_non_follow.py --sessionid YOUR_SESSIONID --csrftoken YOUR_CSRFTOKEN --uid YOUR_USER_ID
```

#### Fetch individual user info:
```bash
python3 fetch_user_info.py --sessionid YOUR_SESSIONID --csrftoken YOUR_CSRFTOKEN username_here
```

#### Unfollow a user:
```bash
python3 unfollow.py USER_ID --sessionid YOUR_SESSIONID --csrftoken YOUR_CSRFTOKEN
```

## Deployment

### Deploy to Render

1. Push to GitHub (already done ✓)
2. Go to [render.com](https://render.com)
3. Create new **Web Service**
4. Connect your GitHub repo
5. Set these settings:
   - **Start Command**: `npm start`
   - **Python Version**: 3.8 (or higher)
   - **Node Version**: 18 (or higher)

6. Deploy!

## Environment Variables

Optional environment variables:

```env
PORT=8000                 # Web server port (default: 8000)
PYTHON_PATH=python3       # Python executable path (default: python3)
```

## Project Structure

```
├── proxy.js              # Express.js server + API endpoints
├── index.html            # Web interface
├── insta_non_follow.py   # Main script: fetch followers/following
├── fetch_user_info.py    # Fetch individual user info
├── unfollow.py           # Unfollow a user
├── check.py              # Check user status
├── .ig_cache/            # Cache directory (auto-created)
└── sessions.json         # Stored sessions (auto-created)
```

## API Endpoints

- `POST /login` - Verify Instagram credentials
- `POST /fetch` - Fetch non-followers (Server-Sent Events stream)
- `POST /unfollow` - Unfollow a user
- `POST /check` - Check user status
- `GET /img` - Image proxy for Instagram avatars

## How It Works

1. **Fetches followers** from Instagram's mobile API
2. **Fetches accounts you follow** from Instagram's mobile API
3. **Compares lists** to find non-followers
4. **Fetches follower counts** for each non-follower
5. **Stores results** in `.ig_cache/` for resumable operations
6. **Cleanup**: Removes large temporary files after processing

## Rate Limiting

To avoid Instagram blocks:
- 3-second delay between API requests
- Automatic retry on rate limits (30-60 second wait)
- Resumable fetch (can restart from last position)

## ⚠️ Important Disclaimer

This project uses Instagram's **unofficial mobile API**. Instagram's Terms of Service prohibit:
- Automated access to Instagram data
- Use of unofficial APIs
- Scraping user information

**Use at your own risk.** This is for educational purposes only.

## License

This project is for educational purposes only. Use responsibly and respect Instagram's Terms of Service.

## Troubleshooting

### "Invalid session" error
- Credentials may have expired
- Try getting new `sessionid` and `csrftoken`
- Instagram may have changed authentication

### "Rate limited" error
- Instagram temporarily blocked the IP
- Wait 30+ minutes before retrying
- Use a VPN to get a different IP (if allowed in your region)

### Port already in use
```bash
# Use a different port
PORT=3000 npm start
```

## Contributing

This is an academic project. Feel free to fork and improve!

---

Made with ❤️ for educational purposes

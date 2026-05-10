# Next.js + Vercel Migration

This branch (`nextjs-vercel-migration`) contains a complete rewrite of the Instagram Non-Follower Tracker app from Python/Express to Next.js, ready for deployment on Vercel.

## What Changed

### Removed
- `proxy.js` - Replaced with Next.js API routes
- `insta_non_follow.py` - Converted to `/api/fetch`
- `fetch_user_info.py` - Converted to `/api/login`
- `unfollow.py` - Converted to `/api/unfollow`
- `check.py` - Converted to `/api/check`
- `requirements.txt` - No longer needed (pure Node.js)
- `pyproject.toml` - No longer needed
- `railway.json` - No longer needed

### Added
- **App Structure** (Next.js App Router)
  - `app/page.tsx` - Main page with login/fetch/results views
  - `app/layout.tsx` - Root layout
  - `app/globals.css` - Global styles
  - `app/admin/page.tsx` - Admin panel

- **API Routes** (Serverless functions)
  - `app/api/login/route.ts` - Login endpoint
  - `app/api/fetch/route.ts` - Fetch non-followers with streaming
  - `app/api/unfollow/route.ts` - Unfollow endpoint
  - `app/api/check/route.ts` - Check user info
  - `app/api/img/route.ts` - Image proxy

- **Components**
  - `components/LoginPage.tsx` - Login form
  - `components/FetchPage.tsx` - Progress tracking
  - `components/ResultsPage.tsx` - Results display & unfollow

- **Configuration**
  - `next.config.js` - Next.js configuration
  - `tsconfig.json` - TypeScript configuration
  - `vercel.json` - Vercel deployment config

- **Utilities**
  - `lib/instagram.ts` - Instagram API helpers (converted from Python)

## How to Test Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## How to Deploy to Vercel

### Option 1: Using Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

### Option 2: Connect GitHub to Vercel
1. Push this branch to GitHub
2. Go to https://vercel.com/new
3. Import the repository
4. Select this branch
5. Click "Deploy"

### Option 3: Git Push to Vercel (if set up)
```bash
git push vercel nextjs-vercel-migration:main
```

## Key Differences from Python Version

### 1. Streaming Still Works
The `/api/fetch` route uses `ReadableStream` to send server-sent events (SSE) just like the Python version, showing real-time progress.

### 2. No Python Dependency
Everything runs on Node.js, making deployment on Vercel straightforward without runtime issues.

### 3. Better Performance
- Faster cold starts (no Python startup overhead)
- Vercel's optimized runtime
- Built-in edge caching

### 4. Cleaner Frontend
- React components instead of vanilla JS
- TypeScript for type safety
- Modern CSS with CSS-in-JS support

## Instagram API Notes

The core Instagram API logic remains the same:
- Fetches followers/following lists via `i.instagram.com/api/v1`
- Requires `sessionid` and `csrftoken` from Instagram cookies
- Implements rate-limit handling (3-30 second delays)
- Stores results in `.ig_cache/{uid}/` directory

## Next Steps

1. **Test locally** with fresh Instagram credentials
2. **Fix any issues** that appear in browser console
3. **Deploy to Vercel**
4. **Monitor** for any edge cases or improvements

## Environment Variables (Optional)

For production, you might want to add:
- `MAX_DURATION` - Function timeout (Vercel Pro: 900s, default: 60s)
- `NODE_ENV` - Set to "production"

These can be set in Vercel dashboard under Settings → Environment Variables.

## Troubleshooting

### "fetch failed" error
- Check Instagram credentials are valid
- Instagram API might have rate-limited the session
- Try with fresh credentials from browser cookies

### "Failed to parse user data"
- Instagram API response format might have changed
- Check browser console for exact error

### Image proxy not working
- Vercel might be blocking Instagram's image domain
- Try accessing images directly if proxy fails

## File Size

This should be much smaller than the Railway deployment since we don't need Python:
- No node_modules bloat (minimal Next.js footprint)
- No Python interpreter
- Faster deployments

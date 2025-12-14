# Telegram Mini App - Supabase Setup Guide

## Prerequisites

1. **Supabase CLI** - Install if you haven't:
   ```bash
   npm install -g supabase
   # or
   brew install supabase/tap/supabase
   ```

2. **Deno** (for Edge Functions) - Install:
   ```bash
   # Windows (PowerShell)
   irm https://deno.land/install.ps1 | iex
   
   # macOS/Linux
   curl -fsSL https://deno.land/install.sh | sh
   ```

## Step 1: Database Schema Setup

### Option A: Via Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard/project/zvzzwmlpimznzyaayvxt/editor
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/schema.sql`
5. Paste into the editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

### Option B: Via Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref zvzzwmlpimznzyaayvxt

# Push the schema
supabase db push
```

## Step 2: Deploy Edge Functions

### Set Secrets First

In Supabase Dashboard:
1. Go to **Settings** → **Edge Functions** → **Manage secrets**
2. Add these secrets:
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token from @BotFather
   - (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected)

Or via CLI:
```bash
supabase secrets set TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### Deploy Functions

```bash
# Deploy all functions
supabase functions deploy daily-claim
supabase functions deploy spin
supabase functions deploy invite
supabase functions deploy wager

# Or deploy all at once
supabase functions deploy
```

## Step 3: Configure Client Environment

### Option A: Inject at Runtime (Recommended for Telegram WebApp)

Create a small server that serves `index.html` with injected env:

**server.js** (Node.js example):
```js
const express = require('express');
const fs = require('fs');
const app = express();

const SUPABASE_URL = 'https://zvzzwmlpimznzyaayvxt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Your anon key

app.get('/', (req, res) => {
  let html = fs.readFileSync('./index.html', 'utf8');
  html = html.replace(
    '<script src="script.js"></script>',
    `<script>
      window.SUPABASE_URL = "${SUPABASE_URL}";
      window.SUPABASE_ANON_KEY = "${SUPABASE_ANON_KEY}";
    </script>
    <script src="script.js"></script>`
  );
  res.send(html);
});

app.use(express.static('.'));
app.listen(3000, () => console.log('Server on http://localhost:3000'));
```

### Option B: Build Tool (Vite/Webpack)

If using a bundler, create `.env`:
```
VITE_SUPABASE_URL=https://zvzzwmlpimznzyaayvxt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Then in `script.js`:
```js
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

## Step 4: Update Client to Use Edge Functions

Replace direct Supabase calls with Edge Function calls. Update these functions in `script.js`:

```js
// Update persistTaskState for daily claims
async function persistTaskState(taskId, status, extra = {}){
  if(!supa) return;
  
  if(taskId === "daily" && extra.daily_date){
    const initData = window.Telegram?.WebApp?.initData || "";
    const response = await fetch(`${SUPABASE_URL}/functions/v1/daily-claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData })
    });
    const result = await response.json();
    if(!result.ok) throw new Error(result.reason || result.error);
    return;
  }
  
  // Other tasks use direct upsert (or create separate edge functions)
  const payload = {
    user_id: user.id,
    task_id: taskId,
    status,
    updated_at: new Date().toISOString(),
    ...extra
  };
  await supa.from("task_progress").upsert(payload);
}

// Update recordSpin
async function recordSpin(prize){
  if(!supa) return;
  const initData = window.Telegram?.WebApp?.initData || "";
  const response = await fetch(`${SUPABASE_URL}/functions/v1/spin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData, prize })
  });
  const result = await response.json();
  if(!result.ok) throw new Error(result.error);
}

// Update recordInviteShare
async function recordInviteShare(){
  if(!supa) return;
  const initData = window.Telegram?.WebApp?.initData || "";
  await fetch(`${SUPABASE_URL}/functions/v1/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData, event_type: "share" })
  });
}
```

## Step 5: Test Locally

### Test with Telegram WebApp

1. Create a Telegram bot via @BotFather
2. Set the Mini App URL to your hosted URL or ngrok tunnel
3. Open the bot and launch the Mini App

### Test without Telegram (Browser Preview)

For testing without Telegram WebApp, the client falls back to URL params or generates a local UUID. You can manually set `window.Telegram` for testing:

```js
// Add to top of script.js for local testing
if(!window.Telegram) {
  window.Telegram = {
    WebApp: {
      initData: "",
      initDataUnsafe: {
        user: {
          id: 12345,
          username: "testuser",
          first_name: "Test",
          last_name: "User"
        }
      }
    }
  };
}
```

## Step 6: Verify Database Tables

Check that tables are created in Supabase Dashboard:
- **Database** → **Tables**
- You should see: `profiles`, `task_progress`, `daily_claims`, `spins`, `invite_events`, `invite_stats`, `wager_monthly`

## Step 7: Monitor Edge Functions

View logs in Supabase Dashboard:
- **Edge Functions** → Select function → **Logs**

Or via CLI:
```bash
supabase functions logs daily-claim
```

## Security Notes

- ✅ **Never commit** your Supabase anon key or bot token to Git
- ✅ Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` (auto-injected, not exposed to client)
- ✅ RLS policies ensure users can only access their own data
- ✅ Telegram signature validation prevents spoofing

## Troubleshooting

### "Invalid Telegram signature" error
- Verify `TELEGRAM_BOT_TOKEN` secret is correct
- Check that `initData` from Telegram WebApp is being passed correctly

### Functions not found (404)
- Ensure functions are deployed: `supabase functions list`
- Check function URL format: `https://zvzzwmlpimznzyaayvxt.supabase.co/functions/v1/daily-claim`

### CORS errors
- Edge Functions include CORS headers by default
- If issues persist, check browser console for specific error

### Database connection errors
- Verify project is linked: `supabase projects list`
- Check RLS policies are created: SQL Editor → `SELECT * FROM pg_policies;`

## Next Steps

1. ✅ Set up proper Telegram bot and WebApp URL
2. ✅ Add real reward logic (balances, payouts)
3. ✅ Implement invite link tracking (referral codes)
4. ✅ Add wager recording from game/betting logic
5. ✅ Set up monitoring/alerting for Edge Functions
6. ✅ Configure production environment variables

## Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Telegram WebApp Docs](https://core.telegram.org/bots/webapps)
- [Telegram WebApp Validation](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)

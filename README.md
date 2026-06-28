# EbEy-ScHaT

A private chat for exactly two people. One of you opens a room and gets a
6-character code. You send that code to the other person any way you like
(text, email, whatever). Each of you picks your **own name and your own
password** when you join — neither of you ever sees the other's password,
and once two people are in, the room is sealed: nobody else can get in even
if they have the code.

There's no group chat, no public room list, no third account. Just a code
and two private keys.

## How it works

- **Open a room** → you pick a name + password → you get a code like `7K3PMN`.
- Send that code to the other person.
- **They enter the code**, pick their own name + password → they're in.
- From then on, refreshing the page asks for name + password again (so a
  stolen link alone isn't enough to get in).
- Messages are stored in a small Redis database and the page polls for new
  ones every 1.5 seconds — simple, and works fine on Vercel's free plan
  without needing a persistent WebSocket connection.
- Rooms and their messages auto-expire after 30 days of inactivity.

## Features

- 🔑 Two private keys — each person sets their own name + password.
- ✍️ Typing indicator — see when the other person is writing.
- ✓ "Seen" receipts on your messages once they're read.
- 🔔 Sound + browser notification on new messages (mutable from the menu).
- 🙂 Emoji picker in the composer.
- 🧹 Clear chat — wipes the message history for both of you.
- ✕ End room — closes the room entirely; the code stops working.

## Deploying it yourself (free)

You'll need a free [Vercel](https://vercel.com) account and a free
[Upstash](https://upstash.com) Redis database (Vercel can create one for you
without leaving its dashboard).

1. **Push this folder to a GitHub repo** (or upload it directly — see below).

2. **Import the repo into Vercel**: vercel.com → Add New → Project → pick the
   repo. Framework preset "Next.js" is detected automatically. Click Deploy.

3. **Add a Redis database**: in your new Vercel project → **Storage** tab →
   **Create Database** → choose **Upstash Redis** (it's free for this use
   case). Connect it to the project — Vercel will automatically add the
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` environment
   variables for you.

4. **Redeploy**: go to the **Deployments** tab → click the latest one → the
   "..." menu → **Redeploy**, so the build picks up the new environment
   variables.

5. Open the live URL Vercel gives you (something like
   `ebey-schat.vercel.app`) — that's your site. Open a room, send the code
   to the other person, done.

### Don't have GitHub set up?

You can also deploy straight from your computer with the Vercel CLI:

```bash
npm install -g vercel
cd ebey-schat
vercel        # follow the prompts, link/create a project
```

Then add the Upstash Redis database from the Vercel dashboard as in step 3
above, and run `vercel --prod` again to redeploy with the new env vars.

### Running it locally first (optional)

```bash
npm install
cp .env.example .env.local   # paste in your Upstash REST URL + token
npm run dev
```

Visit `http://localhost:3000`.

## Notes on privacy

- Passwords are hashed (bcrypt) before being stored — never saved in plain text.
- A session token (not the password) is kept in the browser's `localStorage`
  so you don't have to type your password in on every page load — only after
  closing the tab or clearing site data.
- This is a hobby-grade setup, not a security audit. Treat it like a locked
  diary, not a bank vault: fine for keeping casual conversations away from
  prying eyes, not for anything truly sensitive.

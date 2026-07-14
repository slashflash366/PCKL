# PCKL

A public pickleball court database, game logger, and social app.

## What's inside

- `server.js` — the backend (Node + Express). Handles accounts, courts, games, and friends.
- `db.js` — sets up a small local database file at `data/db.json`. No external database to install.
- `public/` — the frontend (plain HTML/CSS/JS) that runs in your browser and talks to the backend.

## How to run it

You'll need [Node.js](https://nodejs.org) installed (version 18 or newer). To check, open a terminal and run:

```
node -v
```

If that prints a version number, you're set. If not, install Node from nodejs.org first (the "LTS" version).

**1. Open a terminal in this folder.**
Unzip the project if it came as a zip, then `cd` into the `pckl` folder:

```
cd path/to/pckl
```

**2. Install dependencies** (only needed once):

```
npm install
```

This downloads the small set of libraries the server uses (Express, session handling, password hashing, and the local database).

**3. Start the app:**

```
npm start
```

You should see:

```
PCKL running at http://localhost:3000
```

**4. Open it in your browser:**

Go to [http://localhost:3000](http://localhost:3000)

That's it — you're running your own copy of PCKL locally.

## Using it

- Click **Sign up** to create an account.
- **Courts** — comes pre-loaded with real public pickleball courts around St. Louis (Tower Grove Park, Tilles Park, Carondelet Park, and more). Add your own with "+ Add a court," and rate any court 1–5.
- **Log game** — record a match by court, score, and your opponents' usernames (they need an account too). Check "Share this game with your crew" to post it to the Feed with an optional caption, a photo, or a pickleball-themed sticker (paddle, ball, court, trophy, or fire).
- **Feed** — see games your crew has shared, each shown as a colorful post with the photo or sticker attached.
- **My games** — your win/loss record and full game history.
- **Crew** — add other users by username to keep track of who you play with, and to see their shared games in your Feed. Also shows a crew leaderboard ranking everyone by wins in games played against other crew members.
- **Court leaderboards** — tap "🏆 Leaderboard" on any court to see who has the most wins recorded at that specific court.

## Putting it online for real (accessible to anyone, anywhere)

Running it on your own computer only works while your computer is on and only for people on your network. To make it a real public website, you need to put it on a hosting service. Here's the simplest path, using a free host called **Railway**:

**1. Put your code on GitHub**
- Go to [github.com](https://github.com) and make a free account if you don't have one.
- Click the **+** in the top right → **New repository**. Name it `pckl`, keep it Private or Public (either works), click **Create repository**.
- On the next page, click **uploading an existing file**.
- Drag in every file and folder from your `pckl` folder **except** `node_modules` (if it exists) — GitHub will handle the rest. Commit the changes.

**2. Deploy it on Railway**
- Go to [railway.app](https://railway.app) and sign up (you can use your GitHub account to sign in, which makes this step easier).
- Click **New Project** → **Deploy from GitHub repo** → choose your `pckl` repo.
- Railway will detect it's a Node app and automatically run `npm install` and `npm start` for you.

**3. Add a persistent storage volume**
Your app saves data to `data/db.json` and photos to `public/uploads/`. Without this step, that data gets wiped every time the app restarts.
- In your Railway project, click your service → the **Settings** tab → **Volumes** → **Add Volume**.
- Set the mount path to `/app/data` and add it.
- Add a second volume mounted at `/app/public/uploads`.

**4. Set a real session secret**
- In your service, go to the **Variables** tab.
- Add a variable named `SESSION_SECRET` with a long random value (mash your keyboard for 30+ characters).
- Add a variable named `NODE_ENV` with the value `production`.

**5. Get your public URL**
- In the **Settings** tab, under **Networking**, click **Generate Domain**.
- Railway gives you a URL like `https://pckl-production.up.railway.app` — that's your real, public, shareable link. Anyone, anywhere, can open it.

Railway's free trial includes some credit; after that it's pay-as-you-go (a small hobby app like this typically costs a few dollars a month). Render and Fly.io are similar alternatives if you want to compare pricing.

## Where your data lives

Everything is stored in `data/db.json`, a plain text file that gets created the first time you run the app. You can open it in any text editor to see the raw data, back it up, or delete it to start fresh (just stop the server first).

Uploaded photos are saved as actual image files in `public/uploads/` (created automatically the first time someone uploads one).

## Stopping the app

Press `Ctrl + C` in the terminal where it's running.

## Notes on this version

This is a working local prototype — great for you and friends to try on one computer or one shared network. A few things to know:

- Passwords are hashed properly, but the session secret in `server.js` is a placeholder. If you ever deploy this publicly, change `'pckl-dev-secret-change-me'` to a long random string.
- The database is a single JSON file, which is simple and easy to inspect, but isn't built for heavy simultaneous traffic. Fine for personal or small-group use; if this grows into a real public product, it'd be worth moving to a proper database (e.g. PostgreSQL) down the line.
- To let friends on other computers use it (not just your own machine), you'd deploy this to a hosting service (e.g. Render, Railway, Fly.io) rather than just running it locally — happy to walk through that when you're ready.

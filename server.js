const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, crypto.randomUUID() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  }
});

app.use(express.json());
app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET || 'pckl-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production'
  }
}));
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  next();
}

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, username: u.username, displayName: u.displayName };
}

// ---------- Auth ----------

app.post('/api/register', (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const existing = db.get('users').find({ username }).value();
  if (existing) return res.status(400).json({ error: 'That username is already taken' });

  const user = {
    id: crypto.randomUUID(),
    username,
    displayName: displayName || username,
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString()
  };
  db.get('users').push(user).write();
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.get('users').find({ username }).value();
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Incorrect username or password' });
  }
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = db.get('users').find({ id: req.session.userId }).value();
  res.json({ user: publicUser(user) });
});

// ---------- Courts ----------

app.get('/api/courts', (req, res) => {
  const { q } = req.query;
  let courts = db.get('courts').value();
  if (q) {
    const term = q.toLowerCase();
    courts = courts.filter(c =>
      c.name.toLowerCase().includes(term) || (c.address || '').toLowerCase().includes(term)
    );
  }
  const withRatings = courts.map(c => {
    const ratings = c.ratings || [];
    const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : null;
    return {
      ...c,
      avgRating: avg ? Math.round(avg * 10) / 10 : null,
      ratingCount: ratings.length
    };
  });
  res.json({ courts: withRatings });
});

app.post('/api/courts', requireAuth, (req, res) => {
  const { name, address, surface, indoor, lights, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Court name is required' });

  const court = {
    id: crypto.randomUUID(),
    name,
    address: address || '',
    surface: surface || 'unknown',
    indoor: !!indoor,
    lights: !!lights,
    notes: notes || '',
    addedBy: req.session.userId,
    ratings: []
  };
  db.get('courts').push(court).write();
  res.json({ court });
});

app.post('/api/courts/:id/rate', requireAuth, (req, res) => {
  const rating = Number(req.body.rating);
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }
  const courtChain = db.get('courts').find({ id: req.params.id });
  if (!courtChain.value()) return res.status(404).json({ error: 'Court not found' });

  const existing = courtChain.get('ratings').find({ userId: req.session.userId }).value();
  if (existing) {
    courtChain.get('ratings').find({ userId: req.session.userId }).assign({ rating }).write();
  } else {
    courtChain.get('ratings').push({ userId: req.session.userId, rating }).write();
  }
  res.json({ ok: true });
});

// ---------- Games ----------

app.get('/api/games', requireAuth, (req, res) => {
  const users = db.get('users').value();
  const courts = db.get('courts').value();
  const games = db.get('games').value()
    .filter(g => g.teamA.includes(req.session.userId) || g.teamB.includes(req.session.userId))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(g => ({
      ...g,
      teamANames: g.teamA.map(id => users.find(u => u.id === id)?.displayName || 'Unknown'),
      teamBNames: g.teamB.map(id => users.find(u => u.id === id)?.displayName || 'Unknown'),
      courtName: courts.find(c => c.id === g.courtId)?.name || 'Unknown court'
    }));
  res.json({ games });
});

app.post('/api/upload', requireAuth, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No photo received' });
  res.json({ url: '/uploads/' + req.file.filename });
});

app.post('/api/games', requireAuth, (req, res) => {
  const { courtId, teamAUsernames, teamBUsernames, scoreA, scoreB, date, posted, caption, photoUrl, sticker } = req.body;
  if (!courtId || scoreA == null || scoreB == null) {
    return res.status(400).json({ error: 'Court and both scores are required' });
  }
  const users = db.get('users').value();
  const findByUsername = (name) =>
    users.find(u => u.username.toLowerCase() === String(name).trim().toLowerCase());

  const teamA = [req.session.userId];
  (teamAUsernames || []).forEach(n => {
    const u = findByUsername(n);
    if (u && !teamA.includes(u.id)) teamA.push(u.id);
  });

  const teamB = (teamBUsernames || [])
    .map(findByUsername)
    .filter(Boolean)
    .map(u => u.id);

  if (teamB.length === 0) {
    return res.status(400).json({ error: "Enter at least one opponent's username" });
  }

  const game = {
    id: crypto.randomUUID(),
    courtId,
    date: date || new Date().toISOString(),
    teamA,
    teamB,
    scoreA: Number(scoreA),
    scoreB: Number(scoreB),
    loggedBy: req.session.userId,
    posted: !!posted,
    caption: (caption || '').trim(),
    photoUrl: photoUrl || null,
    sticker: sticker || null
  };
  db.get('games').push(game).write();
  res.json({ game });
});

function areFriends(idA, idB) {
  return db.get('friendships').find(f =>
    (f.userId === idA && f.friendId === idB) || (f.userId === idB && f.friendId === idA)
  ).value();
}

app.get('/api/feed', requireAuth, (req, res) => {
  const users = db.get('users').value();
  const courts = db.get('courts').value();
  const myId = req.session.userId;

  const feed = db.get('games').value()
    .filter(g => g.posted && (g.loggedBy === myId || areFriends(g.loggedBy, myId)))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(g => {
      const author = users.find(u => u.id === g.loggedBy);
      return {
        ...g,
        authorName: author ? author.displayName : 'Unknown',
        authorUsername: author ? author.username : 'unknown',
        teamANames: g.teamA.map(id => users.find(u => u.id === id)?.displayName || 'Unknown'),
        teamBNames: g.teamB.map(id => users.find(u => u.id === id)?.displayName || 'Unknown'),
        courtName: courts.find(c => c.id === g.courtId)?.name || 'Unknown court'
      };
    });
  res.json({ feed });
});

app.get('/api/stats', requireAuth, (req, res) => {
  const games = db.get('games').value()
    .filter(g => g.teamA.includes(req.session.userId) || g.teamB.includes(req.session.userId));

  let wins = 0, losses = 0;
  games.forEach(g => {
    const onA = g.teamA.includes(req.session.userId);
    const won = onA ? g.scoreA > g.scoreB : g.scoreB > g.scoreA;
    if (won) wins++; else losses++;
  });
  res.json({ wins, losses, total: games.length });
});

// ---------- Friends ----------

app.get('/api/friends', requireAuth, (req, res) => {
  const friendships = db.get('friendships').value()
    .filter(f => f.userId === req.session.userId || f.friendId === req.session.userId);
  const users = db.get('users').value();

  const friends = friendships.map(f => {
    const otherId = f.userId === req.session.userId ? f.friendId : f.userId;
    const other = users.find(u => u.id === otherId);
    return other ? publicUser(other) : null;
  }).filter(Boolean);

  res.json({ friends });
});

app.post('/api/friends', requireAuth, (req, res) => {
  const { username } = req.body;
  const friend = db.get('users').find({ username }).value();
  if (!friend) return res.status(404).json({ error: 'No player with that username' });
  if (friend.id === req.session.userId) return res.status(400).json({ error: "That's you" });

  const existing = db.get('friendships').find(f =>
    (f.userId === req.session.userId && f.friendId === friend.id) ||
    (f.userId === friend.id && f.friendId === req.session.userId)
  ).value();
  if (existing) return res.status(400).json({ error: 'Already in your crew' });

  db.get('friendships').push({ userId: req.session.userId, friendId: friend.id }).write();
  res.json({ ok: true });
});

app.get('/api/courts/:id/leaderboard', (req, res) => {
  const games = db.get('games').value().filter(g => g.courtId === req.params.id);
  const users = db.get('users').value();
  const stats = {};

  games.forEach(g => {
    const aWon = g.scoreA > g.scoreB;
    const winners = aWon ? g.teamA : g.teamB;
    const losers = aWon ? g.teamB : g.teamA;
    winners.forEach(id => {
      if (!stats[id]) stats[id] = { wins: 0, losses: 0 };
      stats[id].wins++;
    });
    losers.forEach(id => {
      if (!stats[id]) stats[id] = { wins: 0, losses: 0 };
      stats[id].losses++;
    });
  });

  const leaderboard = Object.entries(stats)
    .map(([id, s]) => {
      const u = users.find(u => u.id === id);
      return {
        userId: id,
        displayName: u ? u.displayName : 'Unknown',
        username: u ? u.username : 'unknown',
        wins: s.wins,
        losses: s.losses,
        played: s.wins + s.losses
      };
    })
    .sort((a, b) => b.wins - a.wins || b.played - a.played);

  res.json({ leaderboard });
});

app.get('/api/crew/leaderboard', requireAuth, (req, res) => {
  const users = db.get('users').value();
  const myId = req.session.userId;
  const friendships = db.get('friendships').value().filter(f => f.userId === myId || f.friendId === myId);
  const crewIds = [myId, ...friendships.map(f => f.userId === myId ? f.friendId : f.userId)];

  const games = db.get('games').value().filter(g =>
    g.teamA.every(id => crewIds.includes(id)) && g.teamB.every(id => crewIds.includes(id))
  );

  const stats = {};
  crewIds.forEach(id => { stats[id] = { wins: 0, losses: 0 }; });
  games.forEach(g => {
    const aWon = g.scoreA > g.scoreB;
    const winners = aWon ? g.teamA : g.teamB;
    const losers = aWon ? g.teamB : g.teamA;
    winners.forEach(id => { stats[id].wins++; });
    losers.forEach(id => { stats[id].losses++; });
  });

  const leaderboard = Object.entries(stats)
    .map(([id, s]) => {
      const u = users.find(u => u.id === id);
      return {
        userId: id,
        displayName: u ? u.displayName : 'Unknown',
        username: u ? u.username : 'unknown',
        wins: s.wins,
        losses: s.losses,
        played: s.wins + s.losses
      };
    })
    .sort((a, b) => b.wins - a.wins || b.played - a.played);

  res.json({ leaderboard });
});

app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
  next();
});

app.listen(PORT, () => {
  console.log(`PCKL running at http://localhost:${PORT}`);
});

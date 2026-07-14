const state = {
  user: null,
  view: 'courts'
};

const STICKERS = [
  { id: 'paddle', label: 'Paddle', svg: `<svg viewBox="0 0 40 40"><ellipse cx="20" cy="15" rx="12" ry="14" fill="#4F7942" stroke="#12211D" stroke-width="2"/><rect x="17" y="27" width="6" height="11" rx="2" fill="#12211D"/></svg>` },
  { id: 'ball', label: 'Ball', svg: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#D8E830" stroke="#12211D" stroke-width="2"/><circle cx="13" cy="13" r="1.6" fill="#12211D"/><circle cx="27" cy="13" r="1.6" fill="#12211D"/><circle cx="13" cy="27" r="1.6" fill="#12211D"/><circle cx="27" cy="27" r="1.6" fill="#12211D"/><circle cx="20" cy="10" r="1.6" fill="#12211D"/><circle cx="20" cy="30" r="1.6" fill="#12211D"/></svg>` },
  { id: 'court', label: 'Court', svg: `<svg viewBox="0 0 40 40"><rect x="4" y="4" width="32" height="32" rx="2" fill="#173C49" stroke="#12211D" stroke-width="2"/><rect x="4" y="16" width="32" height="8" fill="#4F7942"/><line x1="20" y1="4" x2="20" y2="36" stroke="#F5F1E4" stroke-width="2"/></svg>` },
  { id: 'trophy', label: 'Trophy', svg: `<svg viewBox="0 0 40 40"><path d="M12 6h16v9a8 8 0 01-16 0V6z" fill="#EF9F27" stroke="#12211D" stroke-width="2"/><rect x="17" y="23" width="6" height="8" fill="#EF9F27" stroke="#12211D" stroke-width="2"/><rect x="11" y="31" width="18" height="4" rx="1" fill="#12211D"/></svg>` },
  { id: 'fire', label: 'On fire', svg: `<svg viewBox="0 0 40 40"><path d="M20 4c4 6-2 9 2 14 3-2 4-6 4-6 2 4 2 10-2 14-6 4-14 1-16-5-2-5 1-9 3-11 0 3 2 4 2 4-1-4 2-7 7-10z" fill="#E24B4A" stroke="#12211D" stroke-width="1.5"/></svg>` }
];

const appEl = document.getElementById('app');
const navAuthEl = document.getElementById('nav-auth');
const navLinksEl = document.getElementById('nav-links');

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function h(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.firstElementChild;
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const MEDALS = ['🥇', '🥈', '🥉'];

function renderLeaderboardList(leaderboard, emptyMessage) {
  if (!leaderboard.length) {
    return `<div class="empty">${emptyMessage}</div>`;
  }
  return `<div class="card">` + leaderboard.map((row, i) => `
    <div class="lb-row">
      <div class="lb-rank">${MEDALS[i] || (i + 1)}</div>
      <div class="avatar">${initials(row.displayName)}</div>
      <div style="flex:1;">
        <div class="crew-name">${row.displayName}</div>
        <div class="crew-sub">@${row.username}</div>
      </div>
      <div class="lb-record"><span class="win">${row.wins}W</span> – <span class="loss">${row.losses}L</span></div>
    </div>
  `).join('') + `</div>`;
}

// ---------- Navigation ----------

navLinksEl.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-view]');
  if (!link) return;
  e.preventDefault();
  if (!state.user) {
    state.view = 'login';
    render();
    return;
  }
  state.view = link.dataset.view;
  render();
});

function renderNavAuth() {
  navAuthEl.innerHTML = '';
  if (state.user) {
    const wrap = h(`<div style="display:flex; align-items:center; gap:12px;">
      <span class="mono" style="font-size:13px; color:var(--muted);">@${state.user.username}</span>
      <button class="btn btn-outline btn-small" id="logout-btn">Log out</button>
    </div>`);
    wrap.querySelector('#logout-btn').addEventListener('click', async () => {
      await api('/logout', { method: 'POST' });
      state.user = null;
      state.view = 'courts';
      render();
    });
    navAuthEl.appendChild(wrap);
  } else {
    const wrap = h(`<div style="display:flex; gap:10px;">
      <button class="btn btn-outline btn-small" id="nav-login">Log in</button>
      <button class="btn btn-accent btn-small" id="nav-signup">Sign up</button>
    </div>`);
    wrap.querySelector('#nav-login').addEventListener('click', () => { state.view = 'login'; render(); });
    wrap.querySelector('#nav-signup').addEventListener('click', () => { state.view = 'register'; render(); });
    navAuthEl.appendChild(wrap);
  }

  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.view === state.view);
  });
}

// ---------- Views ----------

async function renderCourts() {
  const { courts } = await api('/courts');
  appEl.innerHTML = `
    <div class="page-head">
      <div class="eyebrow">Public court database</div>
      <h1>Find a court</h1>
    </div>
    <div class="search-row">
      <input type="text" id="court-search" placeholder="Search by name or neighborhood...">
    </div>
    ${state.user ? `<button class="btn btn-outline" id="add-court-btn" style="margin-bottom:20px;">+ Add a court</button>` : ''}
    <div id="add-court-form"></div>
    <div id="court-list"></div>
  `;

  const listEl = document.getElementById('court-list');

  function draw(list) {
    if (!list.length) {
      listEl.innerHTML = '<div class="empty">No courts match that search yet. Be the first to add one.</div>';
      return;
    }
    listEl.innerHTML = '';
    list.forEach(c => {
      const card = h(`
        <div class="card">
          <div class="court-row">
            <div>
              <div class="court-name">${c.name}</div>
              <div class="court-meta">${c.address || 'No address on file'}</div>
              <div style="margin-bottom:8px;">
                <span class="tag">${c.indoor ? 'Indoor' : 'Outdoor'}</span>
                <span class="tag">${c.surface}</span>
                ${c.lights ? '<span class="tag">Lit at night</span>' : ''}
              </div>
              ${c.notes ? `<div class="court-notes">${c.notes}</div>` : ''}
            </div>
            <div class="rating-badge">${c.avgRating ? c.avgRating + ' / 5' : 'Not yet rated'}</div>
          </div>
          ${state.user ? `
            <div class="rate-row">
              ${[1,2,3,4,5].map(n => `<button class="rate-star" data-rating="${n}" data-court="${c.id}">${n}★</button>`).join('')}
            </div>
          ` : ''}
          <button class="btn btn-outline btn-small" style="margin-top:12px;" data-lb-toggle="${c.id}">🏆 Leaderboard</button>
          <div id="lb-${c.id}" style="display:none; margin-top:12px;"></div>
        </div>
      `);
      listEl.appendChild(card);
    });

    listEl.querySelectorAll('.rate-star').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/courts/${btn.dataset.court}/rate`, {
            method: 'POST',
            body: JSON.stringify({ rating: Number(btn.dataset.rating) })
          });
          renderCourts();
        } catch (err) {
          alert(err.message);
        }
      });
    });

    listEl.querySelectorAll('[data-lb-toggle]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const courtId = btn.dataset.lbToggle;
        const host = document.getElementById(`lb-${courtId}`);
        if (host.style.display === 'block') { host.style.display = 'none'; return; }
        host.innerHTML = '<div class="empty">Loading...</div>';
        host.style.display = 'block';
        const { leaderboard } = await api(`/courts/${courtId}/leaderboard`);
        host.innerHTML = renderLeaderboardList(leaderboard, 'No games logged at this court yet.');
      });
    });
  }

  draw(courts);

  document.getElementById('court-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    draw(courts.filter(c => c.name.toLowerCase().includes(term) || (c.address || '').toLowerCase().includes(term)));
  });

  const addBtn = document.getElementById('add-court-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const formHost = document.getElementById('add-court-form');
      if (formHost.innerHTML) { formHost.innerHTML = ''; return; }
      formHost.innerHTML = `
        <div class="card">
          <div class="form-grid">
            <div id="add-court-alert"></div>
            <div class="form-row">
              <label>Court name</label>
              <input type="text" id="f-name" placeholder="e.g. Willow Bend Courts">
            </div>
            <div class="form-row">
              <label>Address or neighborhood</label>
              <input type="text" id="f-address" placeholder="e.g. Clayton, MO">
            </div>
            <div class="form-row">
              <label>Surface</label>
              <select id="f-surface">
                <option>outdoor hard court</option>
                <option>indoor court</option>
                <option>outdoor sport tile</option>
                <option>converted tennis court</option>
              </select>
            </div>
            <div class="checkbox-row">
              <label><input type="checkbox" id="f-indoor"> Indoor</label>
              <label><input type="checkbox" id="f-lights"> Has lights</label>
            </div>
            <div class="form-row">
              <label>Notes for other players</label>
              <textarea id="f-notes" rows="2" placeholder="Anything worth knowing before showing up"></textarea>
            </div>
            <button class="btn btn-accent" id="submit-court">Add court</button>
          </div>
        </div>
      `;
      document.getElementById('submit-court').addEventListener('click', async () => {
        const alertHost = document.getElementById('add-court-alert');
        try {
          await api('/courts', {
            method: 'POST',
            body: JSON.stringify({
              name: document.getElementById('f-name').value,
              address: document.getElementById('f-address').value,
              surface: document.getElementById('f-surface').value,
              indoor: document.getElementById('f-indoor').checked,
              lights: document.getElementById('f-lights').checked,
              notes: document.getElementById('f-notes').value
            })
          });
          renderCourts();
        } catch (err) {
          alertHost.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
        }
      });
    });
  }
}

async function renderLogGame() {
  const { courts } = await api('/courts');
  let selectedSticker = null;
  appEl.innerHTML = `
    <div class="page-head">
      <div class="eyebrow">Game log</div>
      <h1>Log a game</h1>
    </div>
    <div class="card" style="max-width:520px;">
      <div class="form-grid">
        <div id="log-alert"></div>
        <div class="form-row">
          <label>Court</label>
          <select id="g-court">
            ${courts.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label>Your partner's username (leave blank for singles)</label>
          <input type="text" id="g-partner" placeholder="e.g. danny">
        </div>
        <div class="form-row">
          <label>Opponent username</label>
          <input type="text" id="g-opp1" placeholder="e.g. priya">
        </div>
        <div class="form-row">
          <label>Opponent's partner username (leave blank for singles)</label>
          <input type="text" id="g-opp2" placeholder="e.g. marcus">
        </div>
        <div style="display:flex; gap:14px;">
          <div class="form-row" style="flex:1;">
            <label>Your team's score</label>
            <input type="number" id="g-scoreA" placeholder="11">
          </div>
          <div class="form-row" style="flex:1;">
            <label>Opponent's score</label>
            <input type="number" id="g-scoreB" placeholder="9">
          </div>
        </div>
        <div class="checkbox-row">
          <label><input type="checkbox" id="g-posted"> Share this game with your crew</label>
        </div>
        <div id="share-options" style="display:none; flex-direction:column; gap:14px;">
          <div class="form-row">
            <label>Caption (optional)</label>
            <input type="text" id="g-caption" placeholder="e.g. Redemption after last week's loss">
          </div>
          <div class="form-row">
            <label>Add a photo (optional)</label>
            <input type="file" id="g-photo" accept="image/*">
            <div id="photo-preview"></div>
          </div>
          <div class="form-row">
            <label>Or pick a sticker</label>
            <div class="sticker-picker" id="sticker-picker">
              ${STICKERS.map(s => `<button type="button" class="sticker-btn" data-sticker="${s.id}" title="${s.label}">${s.svg}</button>`).join('')}
            </div>
          </div>
        </div>
        <button class="btn btn-accent" id="submit-game">Log game</button>
      </div>
    </div>
  `;

  document.getElementById('g-posted').addEventListener('change', (e) => {
    document.getElementById('share-options').style.display = e.target.checked ? 'flex' : 'none';
  });

  document.getElementById('g-photo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById('photo-preview');
    if (!file) { preview.innerHTML = ''; return; }
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${url}" style="max-width:140px; border-radius:6px; margin-top:8px; border:2px solid var(--ink);">`;
    selectedSticker = null;
    document.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('selected'));
  });

  document.getElementById('sticker-picker').addEventListener('click', (e) => {
    const btn = e.target.closest('.sticker-btn');
    if (!btn) return;
    const isSame = selectedSticker === btn.dataset.sticker;
    document.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('selected'));
    if (isSame) {
      selectedSticker = null;
    } else {
      selectedSticker = btn.dataset.sticker;
      btn.classList.add('selected');
      document.getElementById('g-photo').value = '';
      document.getElementById('photo-preview').innerHTML = '';
    }
  });

  document.getElementById('submit-game').addEventListener('click', async () => {
    const alertHost = document.getElementById('log-alert');
    try {
      const partner = document.getElementById('g-partner').value.trim();
      const opp1 = document.getElementById('g-opp1').value.trim();
      const opp2 = document.getElementById('g-opp2').value.trim();
      const photoFile = document.getElementById('g-photo').files[0];

      let photoUrl = null;
      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Photo upload failed');
        photoUrl = uploadData.url;
      }

      await api('/games', {
        method: 'POST',
        body: JSON.stringify({
          courtId: document.getElementById('g-court').value,
          teamAUsernames: partner ? [partner] : [],
          teamBUsernames: [opp1, opp2].filter(Boolean),
          scoreA: document.getElementById('g-scoreA').value,
          scoreB: document.getElementById('g-scoreB').value,
          posted: document.getElementById('g-posted').checked,
          caption: document.getElementById('g-caption').value,
          photoUrl,
          sticker: selectedSticker
        })
      });
      const shared = document.getElementById('g-posted').checked;
      alertHost.innerHTML = `<div class="alert alert-ok">Game logged${shared ? ' and shared to your feed' : ''}. Check "My games" to see it.</div>`;
      document.getElementById('g-scoreA').value = '';
      document.getElementById('g-scoreB').value = '';
      document.getElementById('g-caption').value = '';
      document.getElementById('g-photo').value = '';
      document.getElementById('photo-preview').innerHTML = '';
      document.getElementById('g-posted').checked = false;
      document.getElementById('share-options').style.display = 'none';
      selectedSticker = null;
      document.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('selected'));
    } catch (err) {
      alertHost.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  });
}

async function renderFeed() {
  const { feed } = await api('/feed');
  appEl.innerHTML = `
    <div class="page-head">
      <div class="eyebrow">Your crew's games</div>
      <h1>Feed</h1>
    </div>
    <div id="feed-list"></div>
  `;
  const feedList = document.getElementById('feed-list');
  if (!feed.length) {
    feedList.innerHTML = '<div class="card"><div class="empty">Nothing here yet. Log a game and check "Share this game with your crew," or add friends in Crew to see their games.</div></div>';
    return;
  }
  const colorClasses = ['feed-c0', 'feed-c1', 'feed-c2', 'feed-c3', 'feed-c4'];
  const colorFor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % colorClasses.length;
    return colorClasses[hash];
  };

  feedList.innerHTML = feed.map(g => {
    const sticker = STICKERS.find(s => s.id === g.sticker);
    return `
    <div class="feed-post ${colorFor(g.authorUsername)}">
      <div class="feed-post-head">
        <div class="avatar">${initials(g.authorName)}</div>
        <div>
          <div class="crew-name">${g.authorName}</div>
          <div class="crew-sub">@${g.authorUsername} · ${formatDate(g.date)}</div>
        </div>
        <div class="game-score" style="margin-left:auto;">${g.scoreA}–${g.scoreB}</div>
      </div>
      <div class="game-teams" style="margin:10px 0 2px;">${g.teamANames.join(' + ')} vs ${g.teamBNames.join(' + ')}</div>
      <div class="game-meta">${g.courtName}</div>
      ${g.caption ? `<div class="feed-caption">${g.caption}</div>` : ''}
      ${g.photoUrl ? `<img class="feed-photo" src="${g.photoUrl}">` : ''}
      ${sticker && !g.photoUrl ? `<div class="feed-sticker">${sticker.svg}</div>` : ''}
    </div>
  `;
  }).join('');
}

async function renderMyGames() {
  const [{ games }, stats] = await Promise.all([api('/games'), api('/stats')]);
  appEl.innerHTML = `
    <div class="page-head">
      <div class="eyebrow">Your record</div>
      <h1>My games</h1>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="num">${stats.wins}</div><div class="label">Wins</div></div>
      <div class="stat-card"><div class="num">${stats.losses}</div><div class="label">Losses</div></div>
      <div class="stat-card"><div class="num">${stats.total}</div><div class="label">Games logged</div></div>
    </div>
    <div class="card" id="games-card"></div>
  `;

  const gamesCard = document.getElementById('games-card');
  if (!games.length) {
    gamesCard.innerHTML = '<div class="empty">No games logged yet. Head to "Log game" after your next match.</div>';
    return;
  }
  gamesCard.innerHTML = games.map(g => {
    const onA = g.teamA.length && g.teamANames.length && g.teamA.includes(state.user.id);
    const won = onA ? g.scoreA > g.scoreB : g.scoreB > g.scoreA;
    return `
      <div class="game-row">
        <div>
          <div class="game-teams">${g.teamANames.join(' + ')} vs ${g.teamBNames.join(' + ')}</div>
          <div class="game-meta">${g.courtName} · ${formatDate(g.date)}</div>
        </div>
        <div class="game-score ${won ? 'win' : 'loss'}">${g.scoreA}–${g.scoreB}</div>
      </div>
    `;
  }).join('');
}

async function renderCrew() {
  const [{ friends }, { leaderboard }] = await Promise.all([api('/friends'), api('/crew/leaderboard')]);
  appEl.innerHTML = `
    <div class="page-head">
      <div class="eyebrow">Your crew</div>
      <h1>Crew</h1>
    </div>
    <div class="card">
      <div class="form-row">
        <label>Add someone by username</label>
        <div style="display:flex; gap:10px;">
          <input type="text" id="add-friend-input" placeholder="e.g. priya" style="flex:1;">
          <button class="btn btn-accent" id="add-friend-btn">Add</button>
        </div>
      </div>
      <div id="crew-alert"></div>
    </div>
    <div class="card" id="crew-list"></div>
    <div class="page-head" style="margin-top:36px;">
      <div class="eyebrow">Bragging rights</div>
      <h1 style="font-size:26px;">Crew leaderboard</h1>
    </div>
    <div id="crew-lb"></div>
  `;

  document.getElementById('crew-lb').innerHTML = renderLeaderboardList(
    leaderboard,
    'Log a game against someone in your crew to see the leaderboard fill in.'
  );

  const listEl = document.getElementById('crew-list');
  listEl.innerHTML = friends.length
    ? friends.map(f => `
        <div class="crew-row">
          <div class="avatar">${initials(f.displayName)}</div>
          <div>
            <div class="crew-name">${f.displayName}</div>
            <div class="crew-sub">@${f.username}</div>
          </div>
        </div>
      `).join('')
    : '<div class="empty">No one in your crew yet. Add a player above.</div>';

  document.getElementById('add-friend-btn').addEventListener('click', async () => {
    const alertHost = document.getElementById('crew-alert');
    const username = document.getElementById('add-friend-input').value.trim();
    try {
      await api('/friends', { method: 'POST', body: JSON.stringify({ username }) });
      renderCrew();
    } catch (err) {
      alertHost.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  });
}

function renderLogin() {
  appEl.innerHTML = `
    <div class="card auth-card">
      <div class="page-head" style="margin-bottom:20px;">
        <div class="eyebrow">Welcome back</div>
        <h1 style="font-size:26px;">Log in</h1>
      </div>
      <div id="auth-alert"></div>
      <div class="form-grid">
        <div class="form-row">
          <label>Username</label>
          <input type="text" id="l-username">
        </div>
        <div class="form-row">
          <label>Password</label>
          <input type="password" id="l-password">
        </div>
        <button class="btn btn-accent" id="login-btn">Log in</button>
      </div>
      <div class="switch-link">New here? <a href="#" id="to-register">Create an account</a></div>
    </div>
  `;
  document.getElementById('to-register').addEventListener('click', (e) => {
    e.preventDefault(); state.view = 'register'; render();
  });
  document.getElementById('login-btn').addEventListener('click', async () => {
    const alertHost = document.getElementById('auth-alert');
    try {
      const { user } = await api('/login', {
        method: 'POST',
        body: JSON.stringify({
          username: document.getElementById('l-username').value,
          password: document.getElementById('l-password').value
        })
      });
      state.user = user;
      state.view = 'courts';
      render();
    } catch (err) {
      alertHost.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  });
}

function renderRegister() {
  appEl.innerHTML = `
    <div class="card auth-card">
      <div class="page-head" style="margin-bottom:20px;">
        <div class="eyebrow">Join PCKL</div>
        <h1 style="font-size:26px;">Create an account</h1>
      </div>
      <div id="auth-alert"></div>
      <div class="form-grid">
        <div class="form-row">
          <label>Display name</label>
          <input type="text" id="r-display" placeholder="e.g. Jamie Rivera">
        </div>
        <div class="form-row">
          <label>Username</label>
          <input type="text" id="r-username" placeholder="e.g. jamie">
        </div>
        <div class="form-row">
          <label>Password</label>
          <input type="password" id="r-password">
        </div>
        <button class="btn btn-accent" id="register-btn">Create account</button>
      </div>
      <div class="switch-link">Already have an account? <a href="#" id="to-login">Log in</a></div>
    </div>
  `;
  document.getElementById('to-login').addEventListener('click', (e) => {
    e.preventDefault(); state.view = 'login'; render();
  });
  document.getElementById('register-btn').addEventListener('click', async () => {
    const alertHost = document.getElementById('auth-alert');
    try {
      const { user } = await api('/register', {
        method: 'POST',
        body: JSON.stringify({
          username: document.getElementById('r-username').value,
          password: document.getElementById('r-password').value,
          displayName: document.getElementById('r-display').value
        })
      });
      state.user = user;
      state.view = 'courts';
      render();
    } catch (err) {
      alertHost.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  });
}

// ---------- Router ----------

async function render() {
  renderNavAuth();
  try {
    if (state.view === 'login') return renderLogin();
    if (state.view === 'register') return renderRegister();
    if (!state.user && (state.view === 'log' || state.view === 'games' || state.view === 'crew' || state.view === 'feed')) {
      state.view = 'login';
      return renderLogin();
    }
    if (state.view === 'feed') return await renderFeed();
    if (state.view === 'courts') return await renderCourts();
    if (state.view === 'log') return await renderLogGame();
    if (state.view === 'games') return await renderMyGames();
    if (state.view === 'crew') return await renderCrew();
  } catch (err) {
    appEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function init() {
  const { user } = await api('/me');
  state.user = user;
  render();
}

init();

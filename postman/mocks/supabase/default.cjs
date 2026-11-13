// Local-only HTTP contract fixture. Never configure a deployed app against it.
// Also runs directly under Node for Playwright, without a Postman dependency.
const { createServer } = require('node:http');
const { randomUUID, createHash } = require('node:crypto');
const users = new Map(), tokens = new Map(), refresh = new Map();
const preferences = new Map(), practices = new Map(), details = new Map(), rounds = new Map();
let raceResults = [], failWrites = false;
let writeDelay = 0;
let confirmationUser, recoveryUser;
function userFor(email, displayName = 'Test typist') {
  if (!users.has(email)) users.set(email, { id: randomUUID(), email, aud: 'authenticated', role: 'authenticated',
    app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { display_name: displayName },
    created_at: new Date().toISOString(), email_confirmed_at: new Date().toISOString(), identities: [] });
  return users.get(email);
}
function session(user) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),
    Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp })).toString('base64url'), randomUUID()].join('.');
  const refreshToken = randomUUID(); tokens.set(token, user); refresh.set(refreshToken, user);
  return { access_token: token, refresh_token: refreshToken, token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
}
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace(/^\/supabase(?=\/)/, '');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  const send = (code, value) => { res.statusCode = code; res.end(value === undefined ? '' : JSON.stringify(value)); };
  if (req.method === 'OPTIONS') return send(204);
  let body = req.body;
  if (body === undefined) {
    let raw = ''; for await (const chunk of req) raw += chunk;
    try { body = raw ? JSON.parse(raw) : {}; } catch { return send(400, { error: 'invalid JSON' }); }
  }
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const user = tokens.get((req.headers.authorization || '').replace(/^Bearer /, ''));
  if (path === '/health') return send(200, { ok: true });
  if (path === '/auth/v1/authorize') {
    if (url.searchParams.get('provider') !== 'github' || url.searchParams.get('code_challenge_method') !== 's256' || !url.searchParams.get('code_challenge')) return send(400, { error: 'Invalid OAuth request' });
    const redirect = new URL(url.searchParams.get('redirect_to'));
    if (!['http://127.0.0.1:4193', 'http://localhost:15443', 'http://127.0.0.1:15443'].includes(redirect.origin)) return send(400, { error: 'Redirect not allowed by fixture' });
    redirect.searchParams.set('code', 'github-code');
    res.writeHead(302, { Location: redirect.href }); return res.end();
  }
  if (path === '/__control' && req.method === 'POST') { failWrites = body.failWrites === true; writeDelay = Math.max(0, Math.min(5000, Number(body.writeDelay) || 0)); return send(200, { ok: true }); }
  if (path === '/auth/v1/signup') {
    const created = userFor(body.email, body.data?.display_name);
    confirmationUser = created;
    if (body.email.startsWith('confirm-')) return send(200, { user: created });
    return send(200, session(created));
  }
  if (path === '/auth/v1/token') {
    const grant = url.searchParams.get('grant_type');
    const found = grant === 'pkce' ? (body.code_verifier && (body.auth_code === 'github-code' ? userFor('github-oauth@test.local', 'GitHub typist') : body.auth_code === 'recovery-code' ? recoveryUser : body.auth_code === 'confirmation-code' ? confirmationUser : null))
      : grant === 'refresh_token' ? refresh.get(body.refresh_token)
      : body.password === 'password123' ? userFor(body.email) : null;
    return found ? send(200, session(found)) : send(400, { error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' });
  }
  if (path === '/auth/v1/logout') return send(204);
  if (path === '/auth/v1/recover') { recoveryUser = userFor(body.email); return send(200, {}); }
  if (path === '/auth/v1/user') return user ? send(200, user) : send(401, { msg: 'Invalid JWT', code: 'bad_jwt' });
  if (!path.startsWith('/rest/v1/')) return send(501, { error: 'Endpoint not modeled' });
  if (req.headers.apikey !== 'sb_secret_test') return send(401, { message: 'Invalid API key' });
  if (req.method === 'POST' && writeDelay) await new Promise(resolve => setTimeout(resolve, writeDelay));
  if (req.method === 'POST' && failWrites) return send(503, { code: 'UNAVAILABLE', message: 'Injected database outage' });
  const name = path.slice('/rest/v1/'.length);
  if (name === 'rpc/read_solo_leaderboard') {
    const f = body.p_filters, now = Date.now(), days = { all: Infinity, month: 30, week: 7, day: 1 }[f.range];
    const mode = f.mode === 'prose' ? 'prose' : f.test === 'snippets' ? 'code-snippets' : 'code-keywords';
    const eligible = [...practices.values()].filter(r => r.mode === mode && (f.test === 'quotes' ? 'english' : r.language) === f.language &&
      Date.parse(r.created_at) <= now && Date.parse(r.created_at) >= now - days * 86400000 &&
      (f.test === 'time' ? r.settings.timer === f.length : f.test === 'words' ? r.settings.words === f.length :
        f.test === 'quotes' ? r.settings.quotes === 'Random Quotes' : f.test === 'snippets' ? true :
        r.settings.limit?.type === (f.test === 'keywords-time' ? 'time' : 'words') && r.settings.limit?.value === f.length));
    eligible.sort((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    const best = new Map();
    for (const r of eligible) if (!best.has(r.user_id)) best.set(r.user_id, r);
    const ownId = [...best.values()].find(r => r.user_id === body.p_viewer)?.id;
    const ranked = [...best.values()].map((r, index) => {
      const name = [...users.values()].find(u => u.id === r.user_id)?.user_metadata.display_name;
      return { id: r.id, userId: createHash('md5').update(r.user_id).digest('hex'), username: name && !name.includes('@') ? name : 'Anonymous typist',
        mode: f.mode, language: f.language, test: f.test, length: f.length, wpm: r.wpm, raw: r.raw, accuracy: r.accuracy,
        deviation: r.deviation, correct: r.correct, incorrect: r.incorrect, extra: r.extra, date: r.created_at, rank: index + 1 };
    });
    const pages = Math.max(1, Math.ceil(ranked.length / 10)), page = Math.min(f.page, pages);
    return send(200, { rows: ranked.slice((page - 1) * 10, page * 10), currentUser: ranked.find(r => r.id === ownId) ?? null, total: ranked.length, pages, page });
  }
  if (name === 'rpc/read_account_dashboard') {
    const owned = [...practices.values()].filter(row => row.user_id === body.p_user_id);
    const ranked = owned.toSorted((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy || b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
    const bests = [...new Set(ranked.map(row => row.mode))].sort().map(mode => ranked.find(row => row.mode === mode));
    const mean = key => owned.reduce((sum, row) => sum + row[key], 0) / (owned.length || 1);
    return send(200, { stats: { tests: owned.length, seconds: owned.reduce((sum, row) => sum + row.elapsed_seconds, 0),
      characters: owned.reduce((sum, row) => sum + row.correct + row.incorrect + row.extra, 0),
      averageWpm: mean('wpm'), averageRaw: mean('raw'), averageAccuracy: mean('accuracy'), bestWpm: ranked[0]?.wpm ?? 0 }, bests,
      recent: owned.toSorted((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id)).slice(0, 5) });
  }
  if (name === 'rpc/save_account_preferences') {
    const previous = preferences.get(body.p_user_id);
    if ((previous?.revision ?? 0) !== body.p_revision) return send(400, { code: '40001', message: 'Conflict' });
    const revision = body.p_revision + 1;
    preferences.set(body.p_user_id, { user_id: body.p_user_id, data: body.p_data, revision }); return send(200, revision);
  }
  if (name === 'rpc/save_practice_result') {
    const r = body.p_result;
    if (practices.has(r.id)) return practices.get(r.id).user_id === body.p_user_id ? send(200, r.id) : send(409, { code: '23505' });
    const s = r.stats;
    practices.set(r.id, { id: r.id, user_id: body.p_user_id, mode: r.mode, language: r.language, settings: r.settings,
      correct: s.correct, incorrect: s.incorrect, extra: s.extra, wpm: s.wpm, raw: s.raw, accuracy: s.accuracy,
      deviation: s.deviation, elapsed_seconds: s.elapsedSeconds, metric_version: 1, created_at: new Date().toISOString() });
    details.set(r.id, { result_id: r.id, samples: s.samples, history: s.history }); return send(200, r.id);
  }
  if (name === 'rpc/save_race_round') {
    const r = body.p_round;
    if (!rounds.has(r.id)) {
      rounds.set(r.id, { id: r.id, room_id: r.roomId, settings: r.settings, started_at: r.startedAt, ended_at: r.endedAt, outcome: r.outcome });
      raceResults.push(...r.results.map(p => ({ round_id: r.id, participant_id: p.participantId, account_id: p.accountId,
        racer_id: p.userId, username: p.username, wpm: p.wpm, accuracy: p.accuracy, typed_chars: p.typedChars,
        finish_seconds: p.finishSeconds, reason: p.reason, speed_history: p.speedHistory, created_at: new Date().toISOString() })));
    }
    return send(200, r.id);
  }
  let records;
  if (name === 'profiles') records = [...users.values()].map(u => ({ id: u.id, display_name: u.user_metadata.display_name }));
  else if (name === 'user_preferences') records = [...preferences.values()];
  else if (name === 'practice_results') records = [...practices.values()];
  else if (name === 'practice_result_details') records = [...details.values()];
  else if (name === 'race_rounds') records = [...rounds.values()];
  else if (name === 'race_results') records = raceResults;
  else return send(501, { error: 'Table not modeled' });
  for (const [key, value] of url.searchParams) if (value.startsWith('eq.')) records = records.filter(row => String(row[key]) === value.slice(3));
  if (url.searchParams.has('order')) records = records.toSorted((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const from = Number(url.searchParams.get('offset') ?? 0), limit = Number(url.searchParams.get('limit') ?? 1000);
  records = records.slice(from, from + limit);
  const select = url.searchParams.get('select');
  if (select && select !== '*') records = records.map(row => Object.fromEntries(select.split(',').map(key => [key, row[key]])));
  if (req.headers.accept?.includes('application/vnd.pgrst.object+json')) {
    return records.length === 1 ? send(200, records[0]) : send(406, { code: 'PGRST116', details: `The result contains ${records.length} rows`, message: 'Cannot coerce the result to a single JSON object' });
  }
  return send(200, records);
});
server.listen(Number(process.env.PORT || 15443), '127.0.0.1', () => console.log(`Supabase fixture listening on ${server.address().port}`));

// Boots the BUILT backend (backend/dist/main.js) with the local QA environment.
// usage: node run-backend.js [db] [port] [KEY=VALUE ...]   (defaults from config.js)
// BACKEND_ROOT points at another backend checkout (the migration scenario uses it for the old build).
// Extra KEY=VALUE arguments override any env var (e.g. TRUST_PROXY=1).
const fs = require('fs');
const path = require('path');
const cfg = require('./config');

const [db = cfg.DB, port = String(cfg.API_PORT), ...extra] = process.argv.slice(2);
Object.assign(process.env, {
  DB_TYPE: 'postgres', DB_HOST: 'localhost', DB_PORT: String(cfg.PG_PORT), DB_USERNAME: cfg.PG_USER, DB_PASSWORD: cfg.PG_PASSWORD,
  DB_DATABASE: db, DB_SYNCHRONIZE: 'false', // migrations run on boot, like production
  JWT_SECRET: cfg.JWT_SECRET,
  MAIL_HOST: '127.0.0.1', MAIL_PORT: String(cfg.SMTP_PORT), MAIL_FROM: 'qa@example.test', MAIL_USER: 'qa', MAIL_PASSWORD: 'qa',
  FRONTEND_URL: cfg.UI, ADMIN_BOOTSTRAP_SECRET: cfg.BOOTSTRAP_SECRET, PORT: port,
  GOOGLE_CLIENT_ID: 'dummy', GOOGLE_CLIENT_SECRET: 'dummy', GOOGLE_CALLBACK_URL: `http://localhost:${port}/auth/google/callback`,
});
for (const kv of extra) { const i = kv.indexOf('='); process.env[kv.slice(0, i)] = kv.slice(i + 1); }
const root = cfg.BACKEND_ROOT;
const main = path.join(root, 'dist', 'main.js');
if (!fs.existsSync(main)) { console.error(`${main} is missing: build the backend first (cd backend && npm run build)`); process.exit(1); }
process.chdir(root);
require(main);

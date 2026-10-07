// Single source of truth for paths, ports and the throwaway credentials of the QA stack.
// Everything is repo-relative or overridable through QA_* environment variables.
const path = require('path');
const { createRequire } = require('module');

const int = (key, dflt) => (process.env[key] ? Number(process.env[key]) : dflt);

const ROOT = path.resolve(__dirname, '..');
const BACKEND_ROOT = path.resolve(process.env.BACKEND_ROOT || path.join(ROOT, 'backend'));
const FRONTEND_ROOT = path.resolve(process.env.FRONTEND_ROOT || path.join(ROOT, 'frontend'));
const WORK = path.resolve(process.env.QA_WORK || path.join(__dirname, '.work'));

const API_PORT = int('QA_API_PORT', 3311);
const UI_PORT = int('QA_UI_PORT', 8088);

module.exports = {
  ROOT,
  QA_DIR: __dirname,
  BACKEND_ROOT,
  FRONTEND_ROOT,
  DIST: path.resolve(process.env.DIST || path.join(FRONTEND_ROOT, 'dist')),
  WORK, // generated artifacts: embedded Postgres data dir, logs, mail sink, screenshots, state files
  PG_PORT: int('QA_PG_PORT', 55451),
  SMTP_PORT: int('QA_SMTP_PORT', 2525),
  API_PORT,
  UI_PORT,
  DB: process.env.QA_DB || 'qa',
  BASE: process.env.QA_BASE || `http://localhost:${API_PORT}`, // the API, as the scripts see it
  UI: process.env.QA_UI || `http://localhost:${UI_PORT}`, // the SPA behind the nginx-like proxy
  MAIL_LOG: path.resolve(process.env.QA_MAIL_LOG || path.join(WORK, 'mail.log')),
  SHOTS: path.join(WORK, 'shots'),
  // Throwaway values for a local, empty database. None of these is used anywhere else.
  PG_USER: 'postgres',
  PG_PASSWORD: 'postgres',
  JWT_SECRET: 'qa-local-secret-not-for-prod',
  BOOTSTRAP_SECRET: 'qa-bootstrap',
  PW: 'Passw0rd!qa', // password of every user the scripts create
  // Modules that live in backend/node_modules (embedded-postgres, pg, typeorm): the QA harness
  // reuses them instead of installing a second copy.
  backendRequire: createRequire(path.join(BACKEND_ROOT, 'package.json')),
};

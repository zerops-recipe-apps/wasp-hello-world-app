// Normalizes DATABASE_URL for Zerops managed PostgreSQL.
// PG 15+ revokes CREATE on schema public for non-owners; the app user must
// connect to its own database (usually "db"), not the "postgres" maintenance DB.
function getDatabaseFromUrl(url) {
  try {
    const parsed = new URL(url.replace(/^postgresql:/, 'http:'));
    const name = parsed.pathname.replace(/^\//, '').split('/')[0];
    return name ? decodeURIComponent(name) : null;
  } catch {
    const match = url.match(/\/([^/?]+)(?:\?|$)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
}

function normalizePostgresUrl(url, dbName) {
  const parsed = new URL(url.replace(/^postgresql:/, 'http:'));
  const auth =
    parsed.username !== ''
      ? `${encodeURIComponent(decodeURIComponent(parsed.username))}:${encodeURIComponent(decodeURIComponent(parsed.password))}@`
      : '';
  const host = parsed.hostname;
  const port = parsed.port ? `:${parsed.port}` : '';
  const search = parsed.search || '';
  return `postgresql://${auth}${host}${port}/${encodeURIComponent(dbName)}${search}`;
}

function resolveDatabaseUrl() {
  const original = process.env.DATABASE_URL;
  if (!original) {
    return original;
  }

  const currentDb = getDatabaseFromUrl(original);
  const targetDb =
    process.env.APP_DB_NAME ||
    process.env.db_dbName ||
    (currentDb === 'postgres' ? 'db' : null);

  if (!targetDb || targetDb === currentDb) {
    return original;
  }

  const normalized = normalizePostgresUrl(original, targetDb);
  console.log(
    `database-url: switching database "${currentDb ?? '(default)'}" -> "${targetDb}"`,
  );
  process.env.DATABASE_URL = normalized;
  return normalized;
}

module.exports = {
  getDatabaseFromUrl,
  normalizePostgresUrl,
  resolveDatabaseUrl,
};

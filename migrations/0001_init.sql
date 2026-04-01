CREATE TABLE IF NOT EXISTS repos (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  owner     TEXT NOT NULL,
  repo      TEXT NOT NULL,
  UNIQUE(owner, repo)
);

CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  repo_id     INTEGER NOT NULL REFERENCES repos(id),
  pr_number   INTEGER NOT NULL,
  pr_title    TEXT NOT NULL,
  pr_url      TEXT NOT NULL,
  score       INTEGER NOT NULL,
  grade       TEXT NOT NULL,
  critical    INTEGER NOT NULL DEFAULT 0,
  warnings    INTEGER NOT NULL DEFAULT 0,
  suggestions INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS findings (
  id            TEXT NOT NULL,
  review_id     TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  agent         TEXT,
  severity      TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  file_location TEXT,
  PRIMARY KEY (id, review_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_repo ON reviews(repo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_findings_review ON findings(review_id);

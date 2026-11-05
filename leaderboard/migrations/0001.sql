CREATE TABLE players (id TEXT PRIMARY KEY, nickname TEXT NOT NULL DEFAULT '', score INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL DEFAULT 0);
CREATE INDEX ranking ON players(score DESC, updated ASC);
CREATE TABLE runs (id TEXT PRIMARY KEY, player TEXT NOT NULL, started INTEGER NOT NULL, consumed INTEGER NOT NULL DEFAULT 0);
CREATE INDEX run_expiry ON runs(started);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX rate_expiry ON rate_limits(expires);

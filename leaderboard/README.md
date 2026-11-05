# Shared top ten

The game stays on GitHub Pages. This Worker and D1 database store the public top ten independently. `leaderboard-config.js` deliberately stays empty until a real service is deployed and verified. No example scores or browser-local scores are presented as a shared ranking.

## One-time activation

Use a Cloudflare Free account. This code does not change the account's billing plan. Free service quotas still apply.

From the release checkout:

```sh
npx wrangler@4 login
node leaderboard/setup.mjs
```

The setup script creates one database, writes `leaderboard/wrangler.json` with its returned ID, applies the migration, deploys the Worker, checks `/top`, then fills `leaderboard-config.js`. Re-running uses the persisted database ID. If database creation succeeds but ID parsing fails, recover its ID from `npx wrangler@4 d1 list` before retrying; do not create a duplicate.

Then commit the generated configuration and publish the game. No API token belongs in the repository. Wrangler manages login credentials separately.

## Behavior and limits

* Each anonymous browser profile has a random secret stored locally; the server stores its hash. Only its highest result is retained. This is not a cross-device login or verified human identity.
* Read-only `/top` returns only nickname and score, never player tokens or IP addresses.
* Each game gets a short-lived server-issued run ID. Score submissions require the matching player token. Runs are consumed atomically and cannot award again.
* Backend checks elapsed time, plausible distance, fish and stomps, and computes the score formula independently. This is basic tamper resistance, not authoritative game replay or cheat-proof verification.
* Writes are limited to 30 requests per minute per hashed IP bucket. Public names accept 2–20 letters, digits, spaces, underscores or hyphens. Names are rendered as text, not HTML.
* Free-play mode with the pursuing dog disabled is excluded from submission by the client. A modified client can lie about this; stronger enforcement would need server simulation.
* Sessions expire after two hours. Pausing does not extend this deadline. The UI reports failures without preventing play.
* Test scores from `node tools/preview.mjs` live only in memory and are never published.

## Checks

```sh
node tests/game.test.cjs
node tests/leaderboard.test.mjs
node tools/preview.mjs
```

Tests and the local preview use Node's built-in SQLite (Node 22.13+). Preview: http://127.0.0.1:8128.

## Rollback

The original published version is tagged `before-stomp-chase-20261105` (`e1786ea`). Restore the published game files from that tag in a new commit; do not force-push or erase history. Retain the database so rollback does not delete scores.

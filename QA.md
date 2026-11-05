# Stomp and pursuer update — 2026-11-05

Work branch: feature/stomp-chaser.
Rollback tag: before-stomp-chase-20261105 (e1786ea).
Production/main has not been changed.

## Completed
- Descending top contact awards 100 points and bounces the cat.
- Side/underside contact damages the cat with existing invulnerability.
- Ordinary enemies disappear; the pursuer is stunned for two seconds.
- Pursuer catches a blocked cat, jumps obstacles, and retreats after contact.
- HUD score includes distance, fish and stomp bonuses; restart preserves best.
- Instructions describe the new controls and scoring.

## Automated QA
Run: node tests/game.test.cjs
13 checks cover top/side/underside contact, moving birds, swept fast contact,
edge misses, duplicate points, stun, scoring/reset, pursuit, obstacle jumps,
pause, double jump/speed, removed enemies and stopping scheduled music.
The simulation advances 36,000 frames (ten minutes of simulated game time),
restarting after game-over; this is not a ten-minute uninterrupted human run.
JavaScript syntax and git whitespace checks passed.

## Remaining gates before release
- Download and inspect the supplied dog video, then adapt the illustration.
  Download failed in this session; no likeness has been claimed or fabricated.
- Visual desktop and mobile QA, including touch controls and audible music.
  Chrome access was not approved in this session.
- Push branch, merge after QA, and verify the deployed site.
  GitHub push failed: Could not resolve host: github.com.

No personal video or extracted frames are included in this repository.

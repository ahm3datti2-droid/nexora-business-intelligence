// NEXORA seed — DISABLED by owner request (2026-11-19).
// The demo organization and demo account were removed permanently.
// This script is kept as a no-op so `npm run db:seed` still exits 0
// and so the demo dataset can never be recreated by accident.

async function main() {
  console.log("Demo seeding was removed by the owner on 2026-11-19 — nothing to seed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

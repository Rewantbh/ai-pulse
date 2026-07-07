// Runs in GitHub Actions after each news fetch. If any source has failed 3+
// consecutive runs, opens (or updates) a "source-health" issue so breakage is
// never silent. Requires GH_TOKEN with issues:write.
import fs from "fs";

const FAIL_THRESHOLD = 3;
const LABEL = "source-health";

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

if (!repo || !token) {
  console.log("[health-alert] Not running in Actions or no token; skipping.");
  process.exit(0);
}

const health = JSON.parse(fs.readFileSync("public/data/health.json", "utf-8"));
const failing = (health.sources || []).filter((s) => s.failStreak >= FAIL_THRESHOLD);

const api = async (path, options = {}) => {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${path}: ${res.status} ${await res.text()}`);
  return res.json();
};

const existing = await api(`/repos/${repo}/issues?state=open&labels=${LABEL}&per_page=1`);

if (failing.length === 0) {
  if (existing.length > 0) {
    await api(`/repos/${repo}/issues/${existing[0].number}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: `✅ All sources recovered as of ${health.lastRun}. Closing.` }),
    });
    await api(`/repos/${repo}/issues/${existing[0].number}`, {
      method: "PATCH",
      body: JSON.stringify({ state: "closed" }),
    });
    console.log("[health-alert] Sources recovered; closed open issue.");
  } else {
    console.log("[health-alert] All sources healthy.");
  }
  process.exit(0);
}

const list = failing
  .map((s) => `- **${s.name}** — ${s.failStreak} consecutive failed runs (last error: ${s.error || "unknown"})`)
  .join("\n");
const body = `The following news sources have been failing for ${FAIL_THRESHOLD}+ consecutive update runs (as of ${health.lastRun}):\n\n${list}\n\nCheck whether the feed URL changed, the site changed its HTML, or it started blocking the fetcher. See \`public/data/health.json\` for full per-source stats.`;

if (existing.length > 0) {
  await api(`/repos/${repo}/issues/${existing[0].number}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  console.log(`[health-alert] Updated existing issue #${existing[0].number}.`);
} else {
  const issue = await api(`/repos/${repo}/issues`, {
    method: "POST",
    body: JSON.stringify({
      title: `⚠️ News source failure: ${failing.map((s) => s.name).join(", ")}`,
      body,
      labels: [LABEL],
    }),
  });
  console.log(`[health-alert] Opened issue #${issue.number}.`);
}

import { fetchAllNews, saveNewsToFile, getSourceStats, clusterSimilarStories, SourceStat } from "./src/lib/news-fetcher";
import { fetchAllTweets } from "./src/lib/twitter-fetcher";
import { generateMissingSummaries } from "./src/lib/ai-summarizer";
import fs from "fs";
import path from "path";

interface HealthEntry extends SourceStat {
  failStreak: number;
  emptyStreak: number;
}

function writeHealthFile(stats: SourceStat[]) {
  const filePath = path.join(process.cwd(), "public", "data", "health.json");

  const previous: Record<string, HealthEntry> = {};
  try {
    const old = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    (old.sources || []).forEach((s: HealthEntry) => (previous[s.name] = s));
  } catch {
    // First run or corrupt file — start streaks from zero
  }

  const sources: HealthEntry[] = stats.map((s) => ({
    ...s,
    failStreak: s.status === "error" ? (previous[s.name]?.failStreak || 0) + 1 : 0,
    emptyStreak: s.status !== "ok" ? (previous[s.name]?.emptyStreak || 0) + 1 : 0,
  }));

  fs.writeFileSync(
    filePath,
    JSON.stringify({ lastRun: new Date().toISOString(), sources }, null, 2)
  );

  const failing = sources.filter((s) => s.failStreak > 0);
  if (failing.length) {
    console.warn(`[Health] ${failing.length} source(s) erroring: ${failing.map((s) => `${s.name} (x${s.failStreak})`).join(", ")}`);
  }
}

async function main() {
  console.log("Starting unified news fetch (RSS + Twitter)...");
  const [news, tweets] = await Promise.all([fetchAllNews(), fetchAllTweets()]);

  const allItems = [...news, ...tweets];
  const THREE_DAYS_AGO = Date.now() - (120 * 3600 * 1000);

  // Clamp future-dated items (covers tweets too; RSS items already clamped)
  const nowIso = new Date().toISOString();
  allItems.forEach((item) => {
    if (new Date(item.date).getTime() > Date.now()) item.date = nowIso;
  });

  const combinedNews = allItems
    .filter(item => new Date(item.date).getTime() > THREE_DAYS_AGO)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Collapse the same story from multiple outlets into one entry
  const clusteredNews = clusterSimilarStories(combinedNews);
  console.log(`Clustering: ${combinedNews.length} items -> ${clusteredNews.length} stories.`);

  // AI-written TLDRs for stories that still have no body (crawl-blocked sources)
  await generateMissingSummaries(clusteredNews);

  await saveNewsToFile(clusteredNews);

  const stats: SourceStat[] = [
    ...getSourceStats(),
    { name: "X / Twitter (Top AI Voices)", items: tweets.length, status: tweets.length > 0 ? "ok" : "empty" },
  ];
  writeHealthFile(stats);

  console.log(`Unified fetch complete. Final count after 120h filter: ${clusteredNews.length} stories.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

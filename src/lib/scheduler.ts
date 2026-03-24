import cron from "node-cron";
import { fetchAllNews, saveNewsToFile } from "./news-fetcher";
import { fetchAllTools, saveToolsToFile } from "./tools-fetcher";

const syncAll = async () => {
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
  console.log(`[${now}] Starting full sync (News + Tools)...`);
  try {
    const [news, tools] = await Promise.all([fetchAllNews(), fetchAllTools()]);
    await saveNewsToFile(news);
    await saveToolsToFile(tools);
    console.log(`[${now}] Full sync complete.`);
  } catch (error) {
    console.error("Full sync failed:", error);
  }
};

// Hourly news fetch: Every hour at minute 0
cron.schedule("0 * * * *", async () => {
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
  console.log(`[${now}] Starting hourly news sync...`);
  try {
    const news = await fetchAllNews();
    await saveNewsToFile(news);
    console.log(`[${now}] Hourly news sync complete.`);
  } catch (error) {
    console.error("Hourly news sync failed:", error);
  }
});

// Daily tools fetch: 7:00 AM Nepal Time
// Standardizing for system time (NPT)
cron.schedule("0 7 * * *", async () => {
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
  console.log(`[${now}] Starting daily tools sync (Nepal Morning)...`);
  try {
    const tools = await fetchAllTools();
    await saveToolsToFile(tools);
    console.log(`[${now}] Daily tools sync complete.`);
  } catch (error) {
    console.error("Daily tools sync failed:", error);
  }
});

console.log("AI Pulse Scheduler started.");
console.log("- Hourly news sync active (on the hour).");
console.log("- Daily tools sync active (7:00 AM Nepal Time).");

// Run once immediately on start
syncAll();

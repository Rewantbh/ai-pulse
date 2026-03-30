import { fetchAllNews, saveNewsToFile } from "./src/lib/news-fetcher";
import { fetchAllTweets } from "./src/lib/twitter-fetcher";

async function main() {
  console.log("Starting unified news fetch (RSS + Twitter)...");
  const [news, tweets] = await Promise.all([fetchAllNews(), fetchAllTweets()]);
  
  const combinedNews = [...news, ...tweets].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  await saveNewsToFile(combinedNews);
  console.log(`Unified fetch complete. Fetched ${news.length} RSS items and ${tweets.length} tweets.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { fetchAllNews, saveNewsToFile } from "./src/lib/news-fetcher";
import { fetchAllTweets } from "./src/lib/twitter-fetcher";

async function main() {
  console.log("Starting unified news fetch (RSS + Twitter)...");
  const [news, tweets] = await Promise.all([fetchAllNews(), fetchAllTweets()]);
  
  const allItems = [...news, ...tweets];
  const ONE_DAY_AGO = Date.now() - (24 * 3600 * 1000);
  
  const combinedNews = allItems
    .filter(item => new Date(item.date).getTime() > ONE_DAY_AGO)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  await saveNewsToFile(combinedNews);
  console.log(`Unified fetch complete. Final count after 24h filter: ${combinedNews.length} items.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

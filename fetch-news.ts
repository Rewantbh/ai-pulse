import { fetchAllNews, saveNewsToFile } from "./src/lib/news-fetcher";

async function main() {
  console.log("Starting initial news fetch...");
  const news = await fetchAllNews();
  await saveNewsToFile(news);
  console.log("Initial fetch complete.");
}

main().catch(console.error);

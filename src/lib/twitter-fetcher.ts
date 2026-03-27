import { NewsItem } from "./news-fetcher";
import fs from "fs";
import path from "path";

export interface TwitterData {
  lastUpdated: string;
  handles: {
    name: string;
    tweets: {
      text: string;
      url: string;
    }[];
  }[];
}

export async function fetchAllTweets(): Promise<NewsItem[]> {
  const filePath = path.join(process.cwd(), "public", "data", "twitter.json");
  if (!fs.existsSync(filePath)) return [];

  try {
    const data: TwitterData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const newsItems: NewsItem[] = [];

    data.handles.forEach((handle) => {
      handle.tweets.forEach((tweet) => {
        newsItems.push({
          id: tweet.url,
          title: `${handle.name}: ${tweet.text.substring(0, 60)}...`,
          summary: tweet.text,
          source: `X: ${handle.name}`,
          sourceUrl: tweet.url,
          category: "Tools",
          date: new Date().toISOString(), // Approximation
          hot: true,
        });
      });
    });

    return newsItems;
  } catch (e) {
    console.error("Failed to parse twitter.json", e);
    return [];
  }
}

export async function saveTweetsToFile(data: TwitterData) {
  const dataDir = path.join(process.cwd(), "public", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filePath = path.join(dataDir, "twitter.json");
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Saved tweets from ${data.handles.length} handles to ${filePath}`);
}

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
      date?: string; // Optional per-tweet date
    }[];
  }[];
}

export async function fetchAllTweets(): Promise<NewsItem[]> {
  const filePath = path.join(process.cwd(), "public", "data", "twitter.json");
  if (!fs.existsSync(filePath)) return [];

  try {
    const data: TwitterData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    console.log(`[Twitter Fetcher] Raw lastUpdated from JSON: ${data.lastUpdated}`);
    const newsItems: NewsItem[] = [];

    data.handles.forEach((handle) => {
      handle.tweets.forEach((tweet) => {
        // Intelligent Title Extraction
        const lines = tweet.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let title = lines[0] || "";
        
        // If first line is very short or a generic reaction, try the second line
        const reactionPatterns = /^(wow|finally|just|amazing|check this out|introducing|announcing|excited|thrilled|holy|wowza|look|see)/i;
        if (lines.length > 1 && (title.length < 20 || reactionPatterns.test(title))) {
          title = lines[1];
        }

        // Cleanup: remove leading mentions or "Introducing" etc
        title = title.replace(/^(@\w+\s*)+:?\s*/g, ""); // Remove @handle: 
        title = title.replace(/^(Introducing|Announcing|Excited to share|Check out|Just dropped|New:)\s+/i, "");
        
        // Split by first sentence boundary
        title = title.split(/[.!?](?=\s|$)/)[0].trim();
        
        // Final polish
        if (title.length > 85) title = title.substring(0, 82) + "...";
        if (title.length < 5) title = `${handle.name}: Latest Update`;

        // Summary Cleanup (Remove excessive hashtags and trailing links)
        let cleanSummary = tweet.text
          .replace(/#\w+/g, "") // Remove hashtags
          .replace(/https?:\/\/\S+/g, "") // Remove URLs (they have sourceUrl anyway)
          .replace(/\s+/g, " ") // Collapse whitespace
          .trim();

        if (cleanSummary.length > 280) {
          cleanSummary = cleanSummary.substring(0, 277) + "...";
        }

        newsItems.push({
          id: tweet.url,
          title: title,
          summary: cleanSummary,
          source: `X: ${handle.name}`,
          sourceUrl: tweet.url,
          category: "Tools",
          date: tweet.date || data.lastUpdated || new Date().toISOString(),
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

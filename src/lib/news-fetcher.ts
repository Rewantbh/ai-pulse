import Parser from "rss-parser";
import { RSS_FEEDS } from "./rss-feeds";
import fs from "fs";
import path from "path";

const parser = new Parser({
  customFields: {
    item: [["content:encoded", "contentEncoded"]],
  },
});

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  category: string;
  date: string;
  hot: boolean;
}

/**
 * Transforms first-person narratives into neutral, third-person perspective.
 */
function neutralizeSummary(text: string, source: string): string {
  if (!text) return "";
  
  let result = text.trim();
  
  // Basic pronoun replacement
  const sourceName = source.replace(/ (Blog|News|Weekly)/i, "");
  
  const replacements: [RegExp, string][] = [
    [/\bwe are\b/gi, `${sourceName} is`],
    [/\bwe\b/gi, sourceName],
    [/\bour\b/gi, `${sourceName}'s`],
    [/\bus\b/gi, sourceName],
    [/\bi am\b/gi, `the author is`],
    [/\bi\b/gi, `the author`],
    [/\bmy\b/gi, `the author's`],
    [/\bme\b/gi, `the author`],
  ];

  replacements.forEach(([regex, replacement]) => {
    result = result.replace(regex, replacement);
  });

  // Capitalize first letter if it was lowercased after replacement
  result = result.charAt(0).toUpperCase() + result.slice(1);
  
  // Remove marketing fluff
  result = result.replace(/\b(excited to announce|thrilled to share|proud to present)\b/gi, "announced");
  result = result.replace(/\b(check it out|stay tuned|click here)\b/gi, "");

  return result;
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const allItems: NewsItem[][] = await Promise.all(RSS_FEEDS.map(async (feed) => {
    try {
      console.log(`Fetching ${feed.name}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout per feed
      const response = await parser.parseURL(feed.url);
      clearTimeout(timeoutId);
      
      const feedItems: NewsItem[] = [];
      for (const item of response.items) {
        if (!item.title || !item.link) continue;

        let summary = item.contentSnippet || item.content || "";
        
        // Fallback: Fetch from page if summary is poor
        if (!summary || summary.trim().length < 5 || summary.toLowerCase().includes("a blog post by")) {
          try {
            const pageController = new AbortController();
            const pageTimeout = setTimeout(() => pageController.abort(), 8000); // 8s timeout
            
            const pageRes = await fetch(item.link, { signal: pageController.signal });
            const html = await pageRes.text();
            clearTimeout(pageTimeout);
            
            const paragraphs = html.match(/<p[^>]*>(.*?)<\/p>/gi);
            if (paragraphs) {
              for (const p of paragraphs) {
                const text = p.replace(/<[^>]+>/g, '').trim();
                if (text.length > 60 && !text.includes("Hugging Face")) {
                  summary = text;
                  break;
                }
              }
            }
          } catch (e) {
            // Silently fail for individual page fetches to keep the sync moving
          }
        }

        if (summary.length > 280) {
          summary = summary.substring(0, 277) + "...";
        }

        feedItems.push({
          id: item.guid || item.link,
          title: item.title,
          summary: neutralizeSummary(summary, feed.name),
          source: feed.name,
          sourceUrl: item.link,
          category: feed.category,
          date: item.isoDate || new Date().toISOString(),
          hot: false,
        });
      }
      return feedItems;
    } catch (error) {
      console.error(`Error fetching ${feed.name}:`, error);
      return [];
    }
  }));

  const flatItems = allItems.flat();
  
  // Deduplicate by URL
  const uniqueItemsMap = new Map<string, NewsItem>();
  flatItems.forEach((item) => {
    if (!uniqueItemsMap.has(item.sourceUrl)) {
      uniqueItemsMap.set(item.sourceUrl, item);
    }
  });

  // Sort by date descending
  const sortedItems = Array.from(uniqueItemsMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return sortedItems;
}

export async function saveNewsToFile(items: NewsItem[]) {
  const dataDir = path.join(process.cwd(), "public", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filePath = path.join(dataDir, "news.json");
  const data = {
    lastUpdated: new Date().toISOString(),
    news: items,
  };
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Saved ${items.length} news items to ${filePath}`);
}

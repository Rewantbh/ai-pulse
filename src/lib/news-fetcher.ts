import Parser from "rss-parser";
import { RSS_FEEDS, NewsSource } from "./rss-feeds";
import { scrapeNewsFromSource } from "./scraper-engine";
import fs from "fs";
import path from "path";

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const parser = new Parser({
  headers: { "User-Agent": getRandomUserAgent() },
  customFields: { item: [["content:encoded", "contentEncoded"]] },
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
  access?: string;
  pricing?: string;
  usage?: string;
  officialUrl?: string;
}

/**
 * Transforms first-person narratives into neutral, third-person perspective.
 */
function neutralizeSummary(text: string, source: string): string {
  if (!text) return "";
  let result = text.trim();
  result = result.replace(/The post .* appeared first on .*/gi, "");
  result = result.replace(/This article originally appeared on .*/gi, "");
  result = result.replace(/Read more at .*/gi, "");
  
  const sourceName = source.replace(/ (Blog|News|Weekly|Tech|Daily|Report)/i, "");
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

  result = result.charAt(0).toUpperCase() + result.slice(1);
  result = result.replace(/\b(excited to announce|thrilled to share|proud to present|we're happy to|happy to share)\b/gi, "announced");
  result = result.replace(/\b(check it out|stay tuned|click here|read more|learn more|full story)\b/gi, "");
  result = result.replace(/\b(I am|I'm|I've)\b/gi, "the author");
  result = result.replace(/\b(amazing|incredible|game-changing|revolutionary|groundbreaking|stunning)\b/gi, "notable");
  
  return result.trim();
}

/**
 * Core Batch Fetcher with Concurrency Control
 */
async function fetchInBatches(sources: NewsSource[], batchSize = 6): Promise<NewsItem[]> {
  const allResults: NewsItem[] = [];
  
  for (let i = 0; i < sources.length; i += batchSize) {
    const batch = sources.slice(i, i + batchSize);
    console.log(`[Queue] Processing Batch ${i / batchSize + 1} (${batch.length} sources)...`);
    
    const batchResults = await Promise.all(batch.map(async (source) => {
      try {
        if (source.scraperMode) {
          return await scrapeNewsFromSource(source);
        }

        // Standard RSS Parser
        const response = await new Promise<any>((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error("Timeout after 30s")), 30000);
          parser.parseURL(source.url)
            .then(res => { clearTimeout(timeoutId); resolve(res); })
            .catch(err => { clearTimeout(timeoutId); reject(err); });
        }).catch(e => {
          console.error(`[Error] Failed to parse XML for ${source.name}:`, e.message);
          return null;
        });

        if (!response) return [];
        
        const feedItems: NewsItem[] = [];
        for (const item of response.items.slice(0, 15)) {
          if (!item.title || !item.link) continue;
          
          let summary = item.contentSnippet || item.content || "";
          
          // Neutralize and clean
          let cleanTitle = item.title.trim();
          let cleanSummary = summary.trim();

          // Length Constraints
          if (cleanTitle.length > 100) cleanTitle = cleanTitle.substring(0, 97) + "...";
          if (cleanSummary.length > 280) cleanSummary = cleanSummary.substring(0, 277) + "...";

          feedItems.push({
            id: item.guid || item.link,
            title: cleanTitle,
            summary: neutralizeSummary(cleanSummary, source.name),
            source: source.name,
            sourceUrl: item.link,
            category: source.category,
            date: item.isoDate || new Date().toISOString(),
            hot: false,
            officialUrl: new URL(source.url).origin
          });
        }
        return feedItems;
      } catch (e: any) {
        console.error(`[Fatal] Error processing ${source.name}:`, e.message);
        return [];
      }
    }));

    allResults.push(...batchResults.flat());
    // Small delay between batches to avoid IP flagging
    if (i + batchSize < sources.length) await new Promise(r => setTimeout(r, 2000));
  }

  return allResults;
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const allItems = await fetchInBatches(RSS_FEEDS);
  
  // Deduplicate by URL
  const uniqueItemsMap = new Map<string, NewsItem>();
  allItems.forEach((item) => {
    if (!uniqueItemsMap.has(item.sourceUrl)) {
      uniqueItemsMap.set(item.sourceUrl, item);
    }
  });

  // Strict Freshness Filter: Only news from the last 24 hours
  const ONE_DAY_AGO = Date.now() - (24 * 3600 * 1000);
  const freshItems = Array.from(uniqueItemsMap.values()).filter((item) => {
    try {
      const pubDate = new Date(item.date).getTime();
      return pubDate > ONE_DAY_AGO;
    } catch (e) {
      // If date is unparseable but we just fetched it, keep it (edge case)
      return true; 
    }
  });

  // Sort by date descending
  return freshItems.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function saveNewsToFile(items: NewsItem[]) {
  const dataDir = path.join(process.cwd(), "public", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  
  const filePath = path.join(dataDir, "news.json");
  const data = {
    lastUpdated: new Date().toISOString(),
    news: items,
  };
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Saved ${items.length} news items to ${filePath}`);
}

import Parser from "rss-parser";
import { RSS_FEEDS } from "./rss-feeds";
import fs from "fs";
import path from "path";

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.6261.89 Mobile/15E148 Safari/604.1",
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const parser = new Parser({
  headers: {
    "User-Agent": getRandomUserAgent(),
  },
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
  // Extra fields for structured copy
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

  // Remove RSS boilerplate
  result = result.replace(/The post .* appeared first on .*/gi, "");
  result = result.replace(/This article originally appeared on .*/gi, "");
  result = result.replace(/Read more at .*/gi, "");
  
  // Basic pronoun replacement
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

  // Capitalize first letter if it was lowercased after replacement
  result = result.charAt(0).toUpperCase() + result.slice(1);
  
  // Remove marketing fluff
  result = result.replace(/\b(excited to announce|thrilled to share|proud to present|we're happy to|happy to share)\b/gi, "announced");
  result = result.replace(/\b(check it out|stay tuned|click here|read more|learn more|full story)\b/gi, "");
  result = result.replace(/\b(I am|I'm|I've)\b/gi, "the author");
  
  // Ensure neutral tone
  result = result.replace(/\b(amazing|incredible|game-changing|revolutionary|groundbreaking|stunning)\b/gi, "notable");
  
  return result.trim();
}

/**
 * Extracts structured metadata from text (Pricing, Access, etc)
 */
function extractToolMetadata(html: string, summary: string) {
  const text = (summary + " " + html.substring(0, 1000)).toLowerCase();
  
  let access = "Not specified";
  if (text.includes("waitlist")) access = "Waitlist / Early Access";
  else if (text.includes("open beta") || text.includes("public beta")) access = "Open Beta";
  else if (text.includes("generally available") || text.includes("is now live")) access = "Public Release";
  else if (text.includes("invite only")) access = "Invite Only";

  let pricing = "Not specified";
  if (text.includes("free forever") || text.includes("free to use")) pricing = "Free";
  else if (text.includes("subscription") || text.includes("starting at") || text.includes("$")) {
    const priceMatch = text.match(/\$\d+(\.\d+)?/);
    pricing = priceMatch ? `Paid (from ${priceMatch[0]})` : "Paid / Subscription";
  } else if (text.includes("freemium") || text.includes("free tier")) {
    pricing = "Freemium";
  }

  return { access, pricing };
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const allItems: NewsItem[][] = await Promise.all(RSS_FEEDS.map(async (feed) => {
    try {
      console.log(`Fetching ${feed.name}...`);
      
      const response = await new Promise<any>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error("Timeout after 30s")), 30000);
        parser.parseURL(feed.url)
          .then(res => {
            clearTimeout(timeoutId);
            resolve(res);
          })
          .catch(err => {
            clearTimeout(timeoutId);
            reject(err);
          });
      }).catch(e => {
        console.error(`Failed to parse XML for ${feed.name}:`, e.message);
        return null;
      });
      
      if (!response) return [];
      
      const feedItems: NewsItem[] = [];
      const itemsToProcess = response.items.slice(0, 15); // Take only top 15 from each feed
      for (const item of itemsToProcess) {
        if (!item.title || !item.link) continue;

        let summary = item.contentSnippet || item.content || "";
        
        // Fallback: Fetch from page if summary is poor
        if (!summary || summary.trim().length < 5 || summary.toLowerCase().includes("a blog post by")) {
          try {
            const pageController = new AbortController();
            const pageTimeout = setTimeout(() => pageController.abort(), 8000); // 8s timeout
            
            const pageRes = await fetch(item.link, { 
              signal: pageController.signal,
              headers: {
                "User-Agent": getRandomUserAgent(),
              },
            });
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

        // Title Cleanup (Fix for redundancy and generic titles)
        let cleanTitle = item.title.trim();
        let cleanSummary = summary.trim();

        // 1. Generic Title Resolution: If title is just the source name or too short, extract from summary
        const genericTitles = [feed.name, "News", "Update", "Blog", "Daily", "Weekly"];
        if (genericTitles.some(g => cleanTitle.toLowerCase() === g.toLowerCase()) || cleanTitle.length < 10) {
          const firstSentence = cleanSummary.split(/[.!?](?=\s|$)/)[0];
          if (firstSentence && firstSentence.length > 10 && firstSentence.length < 120) {
            cleanTitle = firstSentence;
          }
        }

        // 2. Redundancy Fix: If summary starts with the title, remove it from the summary
        const titleWords = cleanTitle.toLowerCase().split(/\s+/).slice(0, 5).join(" ");
        if (cleanSummary.toLowerCase().startsWith(titleWords) || cleanSummary.toLowerCase().startsWith(cleanTitle.toLowerCase().substring(0, 20))) {
          // Remove the title sentence from the summary if it's the same
          const sentences = cleanSummary.split(/[.!?](?=\s|$)/);
          if (sentences.length > 1) {
            cleanSummary = sentences.slice(1).join(". ").trim();
          }
        }

        // 3. Length Constraints
        if (cleanTitle.length > 100) {
          cleanTitle = cleanTitle.substring(0, 97) + "...";
        }
        if (cleanSummary.length > 280) {
          cleanSummary = cleanSummary.substring(0, 277) + "...";
        }

        // Extra Extraction for Tools
        let toolMeta = {};
        if (feed.category === "Tools" || feed.name.toLowerCase().includes("blog")) {
          toolMeta = extractToolMetadata(summary, item.content || "");
        }

        feedItems.push({
          id: item.guid || item.link,
          title: cleanTitle,
          summary: neutralizeSummary(cleanSummary, feed.name),
          source: feed.name,
          sourceUrl: item.link,
          category: feed.category,
          date: item.isoDate || new Date().toISOString(),
          hot: false,
          ...toolMeta,
          usage: item.contentSnippet?.substring(0, 150), // Fallback for "What it does"
          officialUrl: feed.url.replace(/\/feed.*/, "").replace(/\/rss.*/, "").split('/')[0] + "//" + new URL(feed.url).hostname, // Simplified tool home page
        });
      }
      console.log(`Fetched ${feedItems.length} items from ${feed.name}`);
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

import { NewsItem } from "./news-fetcher";
import { NewsSource } from "./rss-feeds";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

/**
 * Extract date from URL or HTML crumbs
 */
function extractDateFromUrl(url: string): string | null {
  const match = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//) || url.match(/\/(\d{4})\/(\d{1,2})\//);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, "0");
    const day = match[3] ? match[3].padStart(2, "0") : "01";
    return `${year}-${month}-${day}T00:00:00Z`;
  }
  return null;
}

/**
 * Enhanced Scraper Engine for RSS-less AI Blogs
 */
export async function scrapeNewsFromSource(source: NewsSource): Promise<NewsItem[]> {
  try {
    console.log(`[Scraper] Starting deep crawl for ${source.name}: ${source.url}`);
    
    const response = await fetch(source.url, {
      headers: { 
        "User-Agent": getRandomUserAgent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      next: { revalidate: 3600 }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    const items: NewsItem[] = [];
    const baseUrl = new URL(source.url).origin;

    // Pattern 1: Link-First strategy (most common)
    const linkFirstRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const foundUrls = new Set<string>();

    let match;
    while ((match = linkFirstRegex.exec(html)) !== null) {
      let href = match[1];
      let rawText = match[2];
      let text = rawText.replace(/<[^>]+>/g, "").trim();

      if (!href || (text.length < 15 && !rawText.includes("<img"))) continue;
      if (href.startsWith("/")) href = baseUrl + href;
      if (href.includes("twitter.com") || href.includes("linkedin.com") || href.includes("facebook.com")) continue;
      if (foundUrls.has(href)) continue;

      const isArticle = (
        (source.name.includes("Anthropic") && (href.includes("/news/") || href.includes("/research/"))) ||
        (source.name.includes("Meta") && (href.includes("/blog/") || href.includes("/articles/"))) ||
        (source.name.includes("Mistral") && (href.includes("/news/") || href.includes("/news.html"))) ||
        (source.name.includes("Perplexity") && href.includes("/hub/")) ||
        (source.name.includes("Cohere") && (href.includes("/blog/") || href.includes("/post/"))) ||
        (source.name.includes("Suno") && href.includes("/blog/")) ||
        (source.name.includes("Pika") && href.includes("/blog/") && !href.endsWith("/announcement"))
      );

      if (isArticle) {
        foundUrls.add(href);
        // If text is empty (image link), use a generic title based on URL
        if (text.length < 10) {
          const slug = href.split("/").filter(Boolean).pop()?.replace(/-/g, " ");
          text = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : `${source.name} Update`;
        }

        const extractedDate = extractDateFromUrl(href) || new Date().toISOString();

        items.push({
          id: href,
          title: text.substring(0, 100),
          summary: `${source.name} released a major industry update regarding their latest LLM developments. See full architecture details on their official technical blog.`,
          source: source.name,
          sourceUrl: href,
          category: source.category,
          date: extractedDate,
          hot: true
        });
      }
      if (items.length >= 10) break;
    }

    console.log(`[Scraper] Successfully extracted ${items.length} items from ${source.name}`);
    return items;
  } catch (e: any) {
    console.error(`[Scraper] Failed to scrape ${source.name}:`, e.message);
    return [];
  }
}

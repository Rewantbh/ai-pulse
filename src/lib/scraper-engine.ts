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
 * Deep Metadata & Summary Extraction (Fetches article page for HIDDEN content)
 */
export async function verifyArticleDateAndSummary(url: string, sourceName: string): Promise<{ date: string | null; summary: string | null }> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": getRandomUserAgent() },
      next: { revalidate: 3600 }
    });
    if (!response.ok) return { date: null, summary: null };
    
    const html = await response.text();
    
    // 1. Date Extraction (Standard og tags, time tags, or JSON-LD schema)
    const metaDate = (
      html.match(/property="article:published_time"\s+content="([^"]+)"/i)?.[1] ||
      html.match(/property="og:updated_time"\s+content="([^"]+)"/i)?.[1] ||
      html.match(/<time[^>]+datetime="([^"]+)"/i)?.[1] ||
      html.match(/"published_at":"([^"]+)"/i)?.[1] ||
      html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1] ||
      html.match(/"dateModified"\s*:\s*"([^"]+)"/i)?.[1]
    );

    // 2. Summary Extraction (Focus on body content tags to skip nav link descriptions)
    const bodyContentMatch = (
      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
      html.match(/<div[^>]+class="[^"]*richtext[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ||
      html.match(/<div[^>]+class="[^"]*post-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ||
      html.match(/<div[^>]+class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ||
      html
    );

    const paragraphs = bodyContentMatch.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    let extractedSummary = "";
    if (paragraphs) {
      const sentences: string[] = [];
      for (const p of paragraphs) {
        const text = p.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        // Skip short snippets, cookie consents, or sign-up boilerplate
        if (text.length > 40 && !/cookie|consent|newsletter|subscribe|privacy policy|terms of service|copyright|transition period|our partners|privacy settings|browser settings|personal data/i.test(text)) {
          // Split paragraph into sentences
          const pSentences = text.split(/(?<=[.!?])\s+/);
          for (const s of pSentences) {
            const cleanS = s.trim();
            if (cleanS.length > 25 && !/subscribe|newsletter|follow us|sign up|read more|click here|written by|copyright|transition period|consent|cookie|our partners|privacy settings|browser settings|personal data/i.test(cleanS)) {
              sentences.push(cleanS);
            }
          }
        }
        if (sentences.length >= 6) break;
      }
      if (sentences.length > 0) {
        extractedSummary = sentences.slice(0, 6).join(" ");
      }
    }

    // Default fallback if no good paragraph found
    if (!extractedSummary) {
      extractedSummary = `${sourceName} released a major industry update. Click to read the full report on their technical blog.`;
    }

    return { 
      date: metaDate ? new Date(metaDate).toISOString() : null,
      summary: extractedSummary.substring(0, 1500)
    };
  } catch {
    return { date: null, summary: null };
  }
}

/**
 * Custom Scraper for FutureTools.io/news
 */
async function scrapeFutureTools(source: NewsSource): Promise<NewsItem[]> {
  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": getRandomUserAgent() },
      next: { revalidate: 3600 }
    });
    if (!response.ok) return [];
    const html = await response.text();
    
    const items: NewsItem[] = [];
    const THREE_DAYS_AGO = Date.now() - (72 * 3600 * 1000);
    
    // Split by date headers (e.g. "Today — Thursday, May 21, 2026" or "Yesterday — Wednesday..." or "Tuesday, May 19, 2026")
    const segments = html.split(/<h2[^>]*>(?:(?:Today|Yesterday) — )?([A-Z][a-z]+, [A-Z][a-z]+ \d{1,2}, \d{4})<\/h2>/i);
    
    // segments[0] is everything before first date
    for (let i = 1; i < segments.length; i += 2) {
      const dateStr = segments[i];
      const content = segments[i + 1];
      const parsedDate = new Date(dateStr);
      
      if (isNaN(parsedDate.getTime())) continue;
      if (parsedDate.getTime() < THREE_DAYS_AGO) continue;

      if (!content) continue;

      // Split by individual card wrappers
      const cards = content.split(/<div class="rounded-xl border/i);
      
      for (let j = 1; j < cards.length; j++) {
        const cardHtml = cards[j];
        
        const hrefMatch = cardHtml.match(/href="([^"]+)"/i);
        let href = hrefMatch ? hrefMatch[1] : "";
        if (!href) continue;
        
        href = href.replace(/&amp;/g, "&");
        if (href.startsWith("/")) href = new URL(source.url).origin + href;

        const titleMatch = cardHtml.match(/<p class="select-text[^"]*">([\s\S]*?)<\/p>/i) || cardHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
        if (title.length < 10) continue;

        const summaryMatch = cardHtml.match(/<p class="text-sm leading-relaxed text-foreground\/85">([\s\S]*?)<\/p>/i) || cardHtml.match(/<p[^>]*class="[^"]*leading-relaxed[^"]*">([\s\S]*?)<\/p>/i);
        let summary = summaryMatch ? summaryMatch[1].replace(/<[^>]+>/g, "").trim() : "";
        
        // Deep-crawl to get a high-quality, at least 5-sentence summary of the actual target article
        let deepSummary = null;
        if (href) {
          const verification = await verifyArticleDateAndSummary(href, source.name);
          if (verification.summary && !verification.summary.includes("released a major industry update")) {
            deepSummary = verification.summary;
          }
        }

        if (deepSummary) {
          summary = deepSummary;
        } else if (!summary) {
          summary = `${source.name} highlights: ${title}. Read more on the original source.`;
        }

        const isPaywalled = cardHtml.includes("Paywalled") || cardHtml.includes("bg-red-400") || cardHtml.includes("border-l-red-400");
        const isMattPick = cardHtml.includes("Matt's picks") || cardHtml.includes("bg-highlight") || cardHtml.includes("bg-yellow-400");

        // Clean up double quotes and entities
        title = title.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
        summary = summary.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&");

        items.push({
          id: href,
          title: title.substring(0, 100),
          summary: summary.substring(0, 1500),
          source: source.name,
          sourceUrl: href,
          category: source.category,
          date: parsedDate.toISOString(),
          hot: isMattPick,
          access: isPaywalled ? "paywalled" : undefined
        });
      }
    }
    
    return items;
  } catch (e: any) {
    console.error(`[Scraper] FutureTools failed:`, e.message);
    return [];
  }
}

/**
 * Enhanced Scraper Engine for RSS-less AI Blogs
 */
export async function scrapeNewsFromSource(source: NewsSource): Promise<NewsItem[]> {
  try {
    console.log(`[Scraper] Starting deep crawl for ${source.name}: ${source.url}`);
    
    if (source.name === "FutureTools News") {
      return await scrapeFutureTools(source);
    }
    
    const response = await fetch(source.url, {
      headers: { 
        "User-Agent": getRandomUserAgent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      },
      next: { revalidate: 3600 }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    const items: NewsItem[] = [];
    const baseUrl = new URL(source.url).origin;

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
        (source.name.includes("Pika") && href.includes("/blog/") && !href.endsWith("/announcement")) ||
        (source.name.includes("LangChain") && href.includes("/blog/") && href !== "https://www.langchain.com/blog")
      );

      if (isArticle) {
        foundUrls.add(href);
        const urlDate = extractDateFromUrl(href);
        
        // DEEP VERIFICATION: If no date in URL, fetch page to find hidden meta-date AND summary
        const verification = urlDate 
          ? { date: urlDate, summary: null } 
          : await verifyArticleDateAndSummary(href, source.name);
        
        // Fallback summary if we didn't do deep verification or it failed
        const finalSummary = verification.summary || `${source.name} released a major industry update. Click to read the full report on their technical blog.`;

        // DROP POLICY: If we can't prove it's fresh, we don't show it
        if (!verification.date) {
          console.log(`[Scraper] Dropped unverified item: ${href}`);
          continue;
        }

        // FRESHNESS GATE: Only keep if within last 72h (Parity with RSS)
        const THREE_DAYS_AGO = Date.now() - (72 * 3600 * 1000);
        if (new Date(verification.date).getTime() < THREE_DAYS_AGO) {
          console.log(`[Scraper] Dropped stale item (${verification.date}): ${href}`);
          continue;
        }

        if (text.length < 10) {
          const slug = href.split("/").filter(Boolean).pop()?.replace(/-/g, " ");
          text = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : `${source.name} Update`;
        }

        items.push({
          id: href,
          title: text.substring(0, 100),
          summary: finalSummary,
          source: source.name,
          sourceUrl: href,
          category: source.category,
          date: verification.date,
          hot: true
        });
      }
      if (items.length >= 5) break; // Limit deep extraction to top 5 candidates
    }

    console.log(`[Scraper] Successfully extracted ${items.length} verified items from ${source.name}`);
    return items;
  } catch (e: any) {
    console.error(`[Scraper] Failed to scrape ${source.name}:`, e.message);
    return [];
  }
}

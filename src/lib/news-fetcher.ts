import Parser from "rss-parser";
import { RSS_FEEDS, NewsSource } from "./rss-feeds";
import { scrapeNewsFromSource, verifyArticleDateAndSummary } from "./scraper-engine";
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

function isAIContent(title: string, summary: string, source: string): boolean {
  const aiKeywords = [
    "ai", "gpt", "llm", "llms", "claude", "gemini", "anthropic", "openai", "mistral", 
    "llama", "perspective", "suno", "pika", "model", "neural", "machine learning",
    "deep learning", "chatbot", "generative", "stable diffusion", "midjourney", 
    "copilot", "chatgpt", "gpu", "nvidia", "huggingface", "robot", "robotic",
    "agent", "agentic", "workflow", "workflows", "swarm", "swarms", "reasoning", 
    "autonomous", "deepseek", "qwen", "grok", "xai", "autogen", "crewai", "langchain", 
    "llamaindex", "rag", "embedding", "vector database", "multi-agent", "function calling", 
    "tool use", "action transformer", "vlm", "vla", "reinforcement learning", "rlhf"
  ];
  const combined = (title + " " + summary).toLowerCase();
  
  // High-authority AI sources get a free pass (including tech giants and specialized agent labs)
  const aiSources = [
    "Anthropic", "Mistral", "OpenAI", "Suno", "Pika", "Cohere", "Perplexity",
    "Google", "DeepMind", "NVIDIA", "Meta", "Microsoft", "Hugging Face",
    "LangChain", "LlamaIndex", "xAI", "Cognition", "DeepSeek", "FutureTools",
    "Leonardo", "ElevenLabs", "Runway", "Bing", "MIT Technology Review"
  ];
  if (aiSources.some(s => source.toLowerCase().includes(s.toLowerCase()))) return true;

  // For general sources, require at least one AI keyword
  return aiKeywords.some(kw => combined.includes(kw));
}

/**
 * Removes newsletter promos, author bios, and social CTAs from RSS summaries.
 */
function cleanSummary(text: string): string {
  if (!text) return "";
  let result = text.trim();
  
  // 1. Remove Wired/tech blog comment and save story boilerplates
  result = result.replace(/\b(CommentLoader|Save Story|Save this story)\b/gi, "");
  
  // 2. Remove leading image credit lines/paragraphs
  result = result.replace(/^\|\s*(?:Image|Photo|Illustration|Photo-Illustration):?[^|•\n]{1,150}?(?:Getty Images|Getty|Verge|Wired|Reuters|AP|AFP|Bloomberg|Staff)[^|•\n]*?(?:\s+(?=[A-Z])|\s*$)/gi, "");
  result = result.replace(/^[^|•\n]{1,150}?\|\s*(?:Getty Images|AFP|Reuters|AP|Bloomberg|Getty|Unsplash|Shutterstock)(?:\s+(?=[A-Z])|\s*$)/gi, "");
  result = result.replace(/^[^|•\n]{1,150}?•\s*(?:Getty Images|AFP|Reuters|AP|Bloomberg|Getty|Unsplash|Shutterstock)(?:\s+(?=[A-Z])|\s*$)/gi, "");
  result = result.replace(/^(?:Image|Photo|Illustration|Photo-Illustration):\s*[^.\n]{1,150}?(?:Getty|Verge|Wired|Reuters|AP|AFP|Bloomberg|Staff)[^.\n]*?\.?(?:\s+(?=[A-Z])|\s*$)/gi, "");

  // Cleanup any leftover leading punctuation or brand fragments from partial matches
  result = result.replace(/^[\s,;|-]*(?:Getty Images|Getty|Verge|Wired|Reuters|AFP|AP|Bloomberg|Staff)\b/gi, "");
  result = result.replace(/^[\s,;|-]+/g, "");

  // 3. Remove common trailing boilerplate (including cut-off Verge feed footers)
  result = result.replace(/\bRead the \w* at The Verge\b.*/gi, "");
  result = result.replace(/\bRead the article\b.*/gi, "");
  result = result.replace(/\bRead the full story\b.*/gi, "");
  result = result.replace(/Subscribe to our newsletter.*/gi, "");
  result = result.replace(/Sign up for our daily.*/gi, "");
  result = result.replace(/Follow us on (X|Twitter|Facebook|LinkedIn).*/gi, "");
  result = result.replace(/About the author:.*/gi, "");
  result = result.replace(/Image credit:.*/gi, "");
  result = result.replace(/Source:.*/gi, "");
  result = result.replace(/Read more at .*/gi, "");
  result = result.replace(/The post .* appeared first on .*/gi, "");
  
  // Remove newsletter intro styles (e.g. "This is the Stepback...")
  result = result.replace(/This is (the|our) [\w\s]+ newsletter.*/gi, "");
  
  return result.trim();
}

function applyPronounReplacements(text: string, sourceName: string): string {
  let result = text;
  
  // 1. Contractions and multi-word phrases first to avoid partial matching bugs (supporting straight and curly apostrophes)
  const replacements: [RegExp, string][] = [
    [/\b(I am|I['’]m)\b/gi, "the author is"],
    [/\bI['’]ve\b/gi, "the author has"],
    [/\bI['’]d\b/gi, "the author would"],
    [/\bI['’]ll\b/gi, "the author will"],
    [/\bwe are\b/gi, `${sourceName} is`],
    [/\bwe['’]re\b/gi, `${sourceName} is`],
    [/\bwe['’]ve\b/gi, `${sourceName} has`],
    [/\bwe['’]d\b/gi, `${sourceName} would`],
    [/\bwe['’]ll\b/gi, `${sourceName} will`],
    
    // 2. Standalone pronouns
    [/\bwe\b/gi, sourceName],
    [/\bour\b/gi, `${sourceName}'s`],
    [/\bus\b/gi, sourceName],
    [/\bi\b/gi, `the author`],
    [/\bmy\b/gi, `the author's`],
    [/\bme\b/gi, `the author`],
  ];

  replacements.forEach(([regex, replacement]) => {
    result = result.replace(regex, replacement);
  });

  return result;
}

/**
 * Transforms first-person narratives into neutral, third-person perspective.
 */
export function neutralizeSummary(text: string, source: string): string {
  if (!text) return "";
  let cleaned = cleanSummary(text);
  
  const sourceName = source.replace(/\b(Blog|News|Weekly|Tech|Daily|Report)\b|X:/gi, "").trim() || source;
  
  // Split by quotation marks (double quotes and curly quotes) to avoid replacing pronouns inside direct speech/quotes
  const segments = cleaned.split(/(["“‘].*?["”’])/g);
  
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    // A simple heuristic: if a segment starts and ends with quotes, we preserve it as is
    const isQuoted = /^[“"‘].*[”"’]$/.test(seg.trim());
    if (!isQuoted) {
      segments[i] = applyPronounReplacements(seg, sourceName);
    }
  }
  
  let result = segments.join("");

  result = result.charAt(0).toUpperCase() + result.slice(1);
  result = result.replace(/\b(excited to announce|thrilled to share|proud to present|we['’]re happy to|happy to share|excited to share)\b/gi, "announced");
  result = result.replace(/\b(check it out|stay tuned|click here|read more|learn more|full story)\b/gi, "");
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
          const items = await scrapeNewsFromSource(source);
          return items.map(item => ({
            ...item,
            summary: neutralizeSummary(item.summary, item.source).substring(0, 1500)
          }));
        }

        // Standard RSS Parser (fetch + clean bare ampersands)
        const response = await new Promise<any>(async (resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error("Timeout after 30s")), 30000);
          try {
            const res = await fetch(source.url, {
              headers: { "User-Agent": getRandomUserAgent() }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const xmlText = await res.text();
            
            // Clean up unescaped ampersands that break XML parser
            const cleanedXml = xmlText.replace(/&(?!(?:[a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);)/g, "&amp;");
            
            const parsed = await parser.parseString(cleanedXml);
            clearTimeout(timeoutId);
            resolve(parsed);
          } catch (err) {
            clearTimeout(timeoutId);
            reject(err);
          }
        }).catch(e => {
          console.error(`[Error] Failed to parse XML for ${source.name}:`, e.message);
          return null;
        });

        if (!response) return [];
        
        const feedItems: NewsItem[] = [];
        for (const item of response.items.slice(0, 15)) {
          if (!item.title || !item.link) continue;
          
          let rawSummary = item.contentSnippet || item.content || "";
          
          // Signal-to-Noise Filter: Drop non-AI content from general sources
          if (!isAIContent(item.title, rawSummary, source.name)) {
            continue;
          }

          let summary = "";
          let rssFallback = "";
          let rawContent = item.contentEncoded || item.content || item.contentSnippet || "";
          if (rawContent) {
            const cleanText = rawContent.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
            const sentences = cleanText.split(/(?<=[.!?])\s+/)
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 25 && !/subscribe|newsletter|follow us|sign up|read more|click here|written by|copyright|transition period|consent|cookie|our partners|privacy settings|browser settings|personal data/i.test(s));
            
            if (sentences.length >= 5) {
              summary = sentences.slice(0, 6).join(" ");
            } else if (sentences.length >= 2) {
              rssFallback = sentences.slice(0, 6).join(" ");
            }
          }

          // If RSS payload didn't yield at least 5 sentences, deep crawl the article link!
          if (!summary || summary.split(/(?<=[.!?])\s+/).length < 5) {
            const verification = await verifyArticleDateAndSummary(item.link, source.name);
            if (verification.summary && !verification.summary.includes("released a major industry update")) {
              const crawlSentences = verification.summary.split(/(?<=[.!?])\s+/)
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 25 && !/subscribe|newsletter|follow us|sign up|read more|click here|written by|copyright|transition period|consent|cookie|our partners/i.test(s));
              
              if (crawlSentences.length >= 3) {
                summary = crawlSentences.slice(0, 6).join(" ");
              }
            }
          }

          // Fallback hierarchy if we couldn't get a high-quality 3+ sentence summary from deep crawl
          if (!summary) {
            const cleanSnippet = (item.contentSnippet || item.content || "").trim();
            const isSnippetInvalid = /transition period|consent|cookie|our partners|privacy settings|browser settings|personal data/i.test(cleanSnippet);
            
            if (rssFallback && !/transition period|consent|cookie|our partners|privacy settings|browser settings|personal data/i.test(rssFallback)) {
              summary = rssFallback;
            } else if (cleanSnippet && !isSnippetInvalid) {
              summary = cleanSnippet;
            } else {
              summary = `${source.name} released a major industry update. Click to read the full report on their technical blog.`;
            }
          }

          // Neutralize and clean
          let cleanTitle = item.title.trim();
          let neutralizedSummary = neutralizeSummary(summary.trim(), source.name);

          // Length Constraints
          if (cleanTitle.length > 100) cleanTitle = cleanTitle.substring(0, 97) + "...";
          if (neutralizedSummary.length > 1500) neutralizedSummary = neutralizedSummary.substring(0, 1497) + "...";

          feedItems.push({
            id: item.guid || item.link,
            title: cleanTitle,
            summary: neutralizedSummary,
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

  // Recent & Relevant Filter: Only news from the last 120 hours (5 days)
  const THREE_DAYS_AGO = Date.now() - (120 * 3600 * 1000);
  const freshItems = Array.from(uniqueItemsMap.values()).filter((item) => {
    try {
      const pubDate = new Date(item.date).getTime();
      return pubDate > THREE_DAYS_AGO;
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

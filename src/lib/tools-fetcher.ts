import Parser from "rss-parser";
import { TOOL_FEEDS } from "./tool-feeds";
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
  }
});

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  link: string;
  category: string;
  pricing: "Free" | "Freemium" | "Paid" | "Unknown";
  access: string;
  date: string;
}

export async function fetchAllTools(): Promise<ToolItem[]> {
  const allToolsResults = await Promise.all(TOOL_FEEDS.map(async (feed) => {
    try {
      console.log(`Fetching tools from ${feed.name}...`);
      
      // Implement a strict 20s timeout wrapper for the RSS parser
      const fetchPromise = parser.parseURL(feed.url);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout after 20s")), 20000)
      );

      const response = await (Promise.race([fetchPromise, timeoutPromise]) as Promise<any>);
      const feedItems: ToolItem[] = [];

      response.items.forEach((item: any) => {
        if (!item.title || !item.link) return;

        // Filter Product Hunt for AI if specified
        if (feed.filter && !item.title.toLowerCase().includes(feed.filter.toLowerCase()) && !item.contentSnippet?.toLowerCase().includes(feed.filter.toLowerCase())) {
          return;
        }

        const title = item.title;
        let description = item.contentSnippet || item.content || "";
        if (description.length > 200) {
          description = description.substring(0, 197) + "...";
        }

        // Extract direct link for Product Hunt if available in content
        let directLink = item.link;
        if (item.content && item.link.includes("producthunt.com")) {
          const linkMatch = item.content.match(/href="([^"]+\/r\/p\/[^"]+)"/);
          if (linkMatch && linkMatch[1]) {
            directLink = linkMatch[1].replace(/&amp;/g, "&");
          }
        }

        // Heuristic for pricing parsing
        let pricing: "Free" | "Freemium" | "Paid" | "Unknown" = "Unknown";
        const descLower = description.toLowerCase();
        const contentLower = (item.content || "").toLowerCase();
        const combined = descLower + " " + contentLower;

        if (combined.includes("open source") || combined.includes("github.com") || (combined.includes("free") && !combined.includes("trial") && !combined.includes("price"))) {
          pricing = "Free";
        } else if (combined.includes("free trial") || combined.includes("freemium") || combined.includes("start for free") || (combined.includes("free") && combined.includes("plan"))) {
          pricing = "Freemium";
        } else if (combined.includes("paid") || combined.includes("pricing") || combined.includes("subscription") || combined.includes("billing") || combined.includes("purchase")) {
          pricing = "Paid";
        }

        feedItems.push({
          id: item.guid || item.link,
          name: title,
          description: description,
          link: directLink,
          category: feed.category,
          pricing: pricing,
          access: "Direct Link",
          date: item.isoDate || new Date().toISOString(),
        });
      });
      return feedItems;
    } catch (error: any) {
      console.error(`Error fetching tools from ${feed.name}:`, error.message);
      return [];
    }
  }));

  const allTools: ToolItem[] = allToolsResults.flat();

  // Deduplicate by URL
  const uniqueToolsMap = new Map<string, ToolItem>();
  allTools.forEach((tool) => {
    if (!uniqueToolsMap.has(tool.link)) {
      uniqueToolsMap.set(tool.link, tool);
    }
  });

  return Array.from(uniqueToolsMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function saveToolsToFile(items: ToolItem[]) {
  const dataDir = path.join(process.cwd(), "public", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filePath = path.join(dataDir, "tools.json");
  const data = {
    lastUpdated: new Date().toISOString(),
    tools: items,
  };
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Saved ${items.length} tools to ${filePath}`);
}

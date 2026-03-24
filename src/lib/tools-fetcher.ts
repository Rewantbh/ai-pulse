import Parser from "rss-parser";
import { TOOL_FEEDS } from "./tool-feeds";
import fs from "fs";
import path from "path";

const parser = new Parser();

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
  const allTools: ToolItem[] = [];

  for (const feed of TOOL_FEEDS) {
    try {
      console.log(`Fetching tools from ${feed.name}...`);
      const response = await parser.parseURL(feed.url);
      
      response.items.forEach((item) => {
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

        allTools.push({
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
    } catch (error) {
      console.error(`Error fetching tools from ${feed.name}:`, error);
    }
  }

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

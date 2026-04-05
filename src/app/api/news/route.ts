import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { fetchAllNews, saveNewsToFile } from "@/lib/news-fetcher";
import fs from "fs";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "data", "news.json");
  
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return NextResponse.json(JSON.parse(data));
    } else {
      // If file doesn't exist, trigger a fetch
      const news = await fetchAllNews();
      await saveNewsToFile(news);
      return NextResponse.json({
        lastUpdated: new Date().toISOString(),
        news,
      });
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to load news" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const news = await fetchAllNews();
    await saveNewsToFile(news);
    return NextResponse.json({
      success: true,
      lastUpdated: new Date().toISOString(),
      count: news.length,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update news" }, { status: 500 });
  }
}

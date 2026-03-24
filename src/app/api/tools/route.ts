import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "data", "tools.json");
  
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ tools: [], lastUpdated: null });
  }

  const fileData = fs.readFileSync(filePath, "utf-8");
  return NextResponse.json(JSON.parse(fileData));
}

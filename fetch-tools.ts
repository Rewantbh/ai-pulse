import { fetchAllTools, saveToolsToFile } from "./src/lib/tools-fetcher";

async function main() {
  console.log("Starting tools sync...");
  const tools = await fetchAllTools();
  await saveToolsToFile(tools);
  console.log("Tools sync complete.");
}

main().catch(console.error);

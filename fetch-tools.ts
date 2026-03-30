import { fetchAllTools, saveToolsToFile } from "./src/lib/tools-fetcher";

async function main() {
  console.log("Starting tools sync...");
  const tools = await fetchAllTools();
  await saveToolsToFile(tools);
  console.log("Tools sync complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

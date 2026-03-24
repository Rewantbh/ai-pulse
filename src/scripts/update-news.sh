#!/bin/bash
# Script to update AI news
# Can be added to crontab -e for daily updates
# 0 0 * * * /Users/rewantbhandari/.gemini/antigravity/scratch/ai-pulse-next/src/scripts/update-news.sh

echo "Updating AI news at $(date)"
curl -X POST http://localhost:3000/api/news
echo "\nUpdate complete."

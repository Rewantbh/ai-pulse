# AI Pulse - Dynamic AI News & Tools Aggregator

AI Pulse is a real-time aggregator for AI news and tools, designed with a premium aesthetic inspired by FutureTools.io.

## Features

- **Real-time AI News**: Aggregates from sources like OpenAI, Microsoft, NVIDIA, Hugging Face, TechCrunch, and more.
- **AI Tools Directory**: Daily updated list of AI tools with pricing, descriptions, and direct official links.
- **Smart Summarization**: Automatically extracts meaningful paragraphs from articles and converts them to a neutral, third-person perspective.
- **One-Click Sharing**: Copy news items formatted for WhatsApp and Facebook sharing.

## 24/7 Automation & Deployment

This project is configured for fully automated, 24/7 updates using **GitHub Actions**.

### 1. Setup GitHub Automation
1.  Push this code to a new repository on your GitHub account.
2.  Go to **Settings > Actions > General** in your repo and ensure "Allow GitHub Actions to create and approve pull requests" (or Write permissions) is enabled.
3.  The workflow in `.github/workflows/update-data.yml` will automatically:
    -   Update news **every hour**.
    -   Sync new AI tools **every morning (7:00 AM Nepal Time)**.
    -   Commit the fresh data directly back to your repository.

### 2. Deploy the Frontend
The best way to host the website for free is **Vercel**:
1.  Connect your GitHub repository to [Vercel](https://vercel.com).
2.  Your site will be live at a custom URL.
3.  Every time GitHub Actions updates the data, Vercel will detect the change and redeploy the site with the latest news.

## Local Development

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the site.

### Manual Data Refresh
To manually update news or tools:
```bash
npm run fetch-news
npm run fetch-tools
```

export interface NewsSource {
  name: string;
  url: string;
  category: string;
  scraperMode?: boolean;
}

export const RSS_FEEDS: NewsSource[] = [
  // Core AI Companies & Labs (RSS Enabled)
  {
    name: "OpenAI News",
    url: "https://openai.com/news/rss.xml",
    category: "Models",
  },
  {
    name: "Google AI Blog",
    url: "https://blog.google/technology/ai/rss/",
    category: "Research",
  },
  {
    name: "DeepMind Blog",
    url: "https://deepmind.google/blog/rss.xml",
    category: "Research",
  },
  {
    name: "Microsoft AI Blog",
    url: "https://blogs.microsoft.com/ai/feed/",
    category: "Models",
  },
  {
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
    category: "Research",
  },
  {
    name: "NVIDIA Blog",
    url: "https://blogs.nvidia.com/feed/",
    category: "Events",
  },

  // Labs (Scraper Required - No Native RSS)
  {
    name: "Anthropic News",
    url: "https://www.anthropic.com/news",
    category: "Models",
    scraperMode: true,
  },
  {
    name: "Meta AI Blog",
    url: "https://ai.meta.com/blog/",
    category: "Models",
    scraperMode: true,
  },
  {
    name: "Mistral AI News",
    url: "https://mistral.ai/news/",
    category: "Models",
    scraperMode: true,
  },
  {
    name: "Perplexity Hub",
    url: "https://www.perplexity.ai/hub",
    category: "Insights",
    scraperMode: true,
  },
  {
    name: "Cohere Blog",
    url: "https://cohere.com/blog",
    category: "Models",
    scraperMode: true,
  },
  {
    name: "Suno Blog",
    url: "https://suno.com/blog",
    category: "Audio",
    scraperMode: true,
  },
  {
    name: "Pika Blog",
    url: "https://pika.art/blog",
    category: "Video",
    scraperMode: true,
  },

  // Major Tech Publishers (FutureTools Parity)
  {
    name: "The Verge AI",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    category: "Industry",
  },
  {
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed",
    category: "Business",
  },
  {
    name: "VentureBeat AI",
    url: "https://venturebeat.com/category/ai/feed",
    category: "Industry",
  },
  {
    name: "Wired AI",
    url: "https://www.wired.com/feed/tag/ai/latest/rss",
    category: "Industry",
  },
  {
    name: "ZDNet AI",
    url: "https://www.zdnet.com/topic/artificial-intelligence/rss.xml",
    category: "Industry",
  },
  {
    name: "Engadget AI",
    url: "https://www.engadget.com/tag/ai/rss.xml",
    category: "Tools",
  },
  {
    name: "Unite.ai",
    url: "https://www.unite.ai/feed/",
    category: "Research",
  },
  {
    name: "Decrypt AI",
    url: "https://decrypt.co/feed",
    category: "Tech",
  },
  {
    name: "TechRepublic AI",
    url: "https://www.techrepublic.com/rssfeeds/topic/artificial-intelligence/",
    category: "Business",
  },

  // Research & Academic
  {
    name: "arXiv cs.AI",
    url: "https://rss.arxiv.org/rss/cs.AI",
    category: "Papers",
  },
  {
    name: "MIT News ML",
    url: "https://news.mit.edu/rss/topic/machine-learning",
    category: "Research",
  },
  {
    name: "AI Weekly",
    url: "https://aiweekly.co/issues.rss",
    category: "Curation",
  },
  {
    name: "X / Twitter (Top AI Voices)",
    url: "https://x.com/search?q=AI%20news&src=typed_query",
    category: "Social",
    scraperMode: true, // Handled via unified twitter-fetcher
  },
];

"use client";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useState, useMemo, useEffect } from "react";
import { NewsItem } from "@/lib/news-fetcher";
import { ToolItem } from "@/lib/tools-fetcher";
import { ToolCard } from "@/components/ToolCard";
import { NewsRow } from "@/components/NewsRow";
import { Tabs } from "@/components/Tabs";

const NEWS_CATEGORIES = [
  { key: "All", label: "All News" },
  { key: "Models", label: "Models" },
  { key: "Tools", label: "Tools" },
  { key: "Business", label: "Business" },
  { key: "Research", label: "Research" },
];

const TOOL_CATEGORIES = [
  { key: "All", label: "All Tools" },
  { key: "General", label: "General" },
  { key: "Productivity", label: "Productivity" },
  { key: "Launches", label: "Launches" },
  { key: "Industry", label: "Industry" },
];

const TABS = [
  { id: "news", label: "Latest News", icon: <span className="text-lg">📰</span> },
  { id: "tools", label: "New AI Tools", icon: <span className="text-lg">🛠️</span> }
];

export default function AINewsAggregator() {
  const [activeTab, setActiveTab] = useState("news");
  const [activeNewsCategory, setActiveNewsCategory] = useState("All");
  const [activeToolCategory, setActiveToolCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [toolsData, setToolsData] = useState<ToolItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [newsRes, toolsRes] = await Promise.all([
        fetch("/api/news"),
        fetch("/api/tools")
      ]);
      const news = await newsRes.json();
      const tools = await toolsRes.json();
      
      setNewsData(news.news || []);
      setToolsData(tools.tools || []);
      setLastUpdated(news.lastUpdated);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredNews = useMemo(() => {
    let items = newsData;
    if (activeNewsCategory !== "All") {
      items = items.filter((n) => n.category === activeNewsCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((n) => 
        n.title.toLowerCase().includes(q) || 
        n.summary.toLowerCase().includes(q)
      );
    }
    return items;
  }, [activeNewsCategory, searchQuery, newsData]);

  const filteredTools = useMemo(() => {
    let items = toolsData;
    if (activeToolCategory !== "All") {
      items = items.filter((t) => t.category === activeToolCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((t) => 
        t.name.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q)
      );
    }
    return items;
  }, [activeToolCategory, searchQuery, toolsData]);

  const groupedNews = useMemo(() => {
    const groups: Record<string, NewsItem[]> = {};
    filteredNews.forEach((item) => {
      const dateKey = new Date(item.date).toLocaleDateString("en-US", { 
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return groups;
  }, [filteredNews]);

  const sortedDateKeys = useMemo(() => {
    return Object.keys(groupedNews).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedNews]);

  return (
    <div className="min-h-screen bg-gradient-mesh text-slate-100 selection:bg-violet-500/30">
      <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-900/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/20">
              <span className="text-white font-black text-xl tracking-tighter italic">P</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white hidden sm:block">AI PULSE</h1>
          </div>
          
          <div className="flex-grow max-w-md mx-8 hidden md:block">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search tools and news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-full py-2 pl-10 pr-4 transition-all text-sm outline-none"
              />
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 text-right">
            <span className="block font-bold uppercase text-slate-600 tracking-widest">Last Update</span>
            <span>{lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "Synchronizing..."}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-6xl font-black text-white mb-4 tracking-tight leading-none">
            The World's Best <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
              AI Tools & News
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-lg">
            Discover the future of artificial intelligence with daily tool drops and real-time news updates.
          </p>
        </div>

        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {(activeTab === "news" ? NEWS_CATEGORIES : TOOL_CATEGORIES).map((cat) => (
            <button
              key={cat.key}
              onClick={() => activeTab === "news" ? setActiveNewsCategory(cat.key) : setActiveToolCategory(cat.key)}
              className={`px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all ${
                (activeTab === "news" ? activeNewsCategory : activeToolCategory) === cat.key
                  ? "bg-slate-200 border-slate-200 text-slate-900"
                  : "bg-transparent border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-slate-900/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : activeTab === "news" ? (
          <div className="space-y-16 max-w-3xl mx-auto">
            {sortedDateKeys.length > 0 ? sortedDateKeys.map((dateKey) => (
              <section key={dateKey}>
                <div className="flex items-center gap-4 mb-8">
                  <h3 className="text-xl font-bold text-white whitespace-nowrap">{dateKey}</h3>
                  <div className="h-px bg-slate-800 flex-grow" />
                </div>
                <div className="bg-slate-900/30 border border-slate-800/40 rounded-2xl overflow-hidden divide-y divide-slate-800/40">
                  {groupedNews[dateKey].map((item) => (
                    <NewsRow key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )) : (
              <div className="text-center py-20 text-slate-500 font-medium">No results found in the news galaxy.</div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.length > 0 ? filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            )) : (
              <div className="col-span-full text-center py-20 text-slate-500 font-medium">No AI tools matching your search.</div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 py-12 px-6 bg-slate-950/50 mt-20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex flex-col gap-4">
            <h4 className="text-lg font-black text-white italic">AI PULSE</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Updating every hour to bring you the edge of innovation. 
              Designed for the explorers of tomorrow.
            </p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em] mb-2">Curated with ❤️ in Nepal</p>
            <p className="text-xs text-slate-400">© 2026 AI Pulse Network</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { NewsItem } from "@/lib/news-fetcher";
import { useState } from "react";

export function NewsRow({ item }: { item: NewsItem }) {
  const [copied, setCopied] = useState(false);
  const domain = new URL(item.sourceUrl).hostname.replace("www.", "");

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `📢 ${item.title}\n\n${item.summary || ""}\n\nVia ${item.source}\nRead more: ${item.sourceUrl}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  return (
    <div 
      className="flex items-center gap-4 py-4 px-4 hover:bg-slate-800/40 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-slate-700/50"
      onClick={() => window.open(item.sourceUrl, "_blank")}
    >
      <div className="hidden sm:flex flex-col items-center justify-center min-w-[60px] text-slate-500">
        <span className="text-[10px] font-bold uppercase tracking-tighter">{item.source.split(' ')[0]}</span>
      </div>
      
      <div className="flex-grow flex flex-col gap-1">
        <h3 className="text-[15px] font-semibold text-slate-200 group-hover:text-violet-400 transition-colors leading-snug">
          {item.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-500">{domain}</span>
          <span className="text-slate-700">•</span>
          <span className="text-[11px] text-slate-500">
            {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={copyToClipboard}
          className={`p-2 rounded-lg transition-all ${copied ? 'bg-green-500/20 text-green-400' : 'text-slate-500 hover:bg-slate-700/50 hover:text-slate-200'}`}
          title="Copy for sharing"
        >
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        
        <div className="text-slate-600 group-hover:text-violet-500 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </div>
      </div>
    </div>
  );
}

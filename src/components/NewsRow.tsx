import { NewsItem } from "@/lib/news-fetcher";
import { useState } from "react";

export function NewsRow({ item }: { item: NewsItem }) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const domain = new URL(item.sourceUrl).hostname.replace("www.", "");

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const dateStr = new Date(item.date).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

    const lines = [`📢 ${item.title}`, ""];
    if (item.summary) {
      lines.push(item.summary, "");
    }
    lines.push(`📰 Source: ${item.source} (${domain})`);
    lines.push(`🗓 ${dateStr}`);
    lines.push(`🔗 Read in full: ${item.sourceUrl}`);
    if (item.relatedCoverage && item.relatedCoverage.length > 0) {
      lines.push("", "Also covered by:");
      item.relatedCoverage.forEach((r) => lines.push(`• ${r.source}: ${r.url}`));
    }

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRowClick = (e: React.MouseEvent) => {
    if (item.summary) {
      setIsExpanded(!isExpanded);
    } else {
      window.open(item.sourceUrl, "_blank");
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(item.sourceUrl, "_blank");
  };
  
  return (
    <div 
      className="flex flex-col py-4 px-4 hover:bg-slate-800/25 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-slate-850"
      onClick={handleRowClick}
    >
      <div className="flex items-center gap-4 w-full">
        {/* Source Icon / Badging Column */}
        <div className="hidden sm:flex flex-col items-center justify-center min-w-[65px] text-slate-500 select-none">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded border border-slate-700/20">
            {item.source.split(' ')[0]}
          </span>
        </div>
        
        {/* Main Title & Metadata Column */}
        <div className="flex-grow flex flex-col gap-1.5 min-w-0">
          <h3 
            onClick={handleLinkClick}
            className="text-[14.5px] font-semibold text-slate-200 hover:text-violet-400 group-hover:text-slate-100 transition-colors leading-snug font-sans tracking-tight"
          >
            {item.title}
          </h3>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 select-none">
            <span onClick={handleLinkClick} className="text-[11px] font-medium text-slate-500 hover:text-slate-400 transition-colors">{domain}</span>
            <span className="text-slate-800 text-xs select-none">•</span>
            <span className="text-[11px] text-slate-500">
              {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            
            {/* Badges */}
            {item.hot && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-[0_0_12px_rgba(139,92,246,0.1)]">
                🔥 Matt's Pick
              </span>
            )}
            {item.access === "paywalled" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                🔒 Paywalled
              </span>
            )}
            {item.relatedCoverage && item.relatedCoverage.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
                +{item.relatedCoverage.length} source{item.relatedCoverage.length > 1 ? "s" : ""}
              </span>
            )}
            
            {item.summary && (
              <>
                <span className="text-slate-800 text-xs select-none">•</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                  className="text-[10px] font-black uppercase tracking-wider text-violet-450 hover:text-violet-350 transition-colors cursor-pointer"
                >
                  {isExpanded ? "Hide TLDR" : "Show TLDR"}
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Actions Column (Share, Expand Chevron, External Link) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 select-none">
          <button 
            onClick={copyToClipboard}
            className={`p-2 rounded-lg transition-all border ${
              copied 
                ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                : 'border-transparent text-slate-500 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-700/40'
            }`}
            title="Copy news text for sharing"
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          
          <button 
            onClick={handleLinkClick}
            className="p-2 rounded-lg border border-transparent text-slate-500 hover:bg-slate-800 hover:text-violet-450 hover:border-slate-700/40 transition-all"
            title="Open original article"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </button>

          {item.summary && (
            <div 
              className={`p-1.5 rounded-lg text-slate-600 transition-all duration-300 ${
                isExpanded ? 'transform rotate-180 text-violet-400' : 'group-hover:text-slate-400'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Collapsible TLDR/Summary Section */}
      {isExpanded && item.summary && (
        <div 
          className="mt-3 ml-0 sm:ml-[81px] p-4 rounded-xl bg-slate-950/40 border border-slate-800/40 text-xs text-slate-300 leading-relaxed transition-all duration-300 animate-in fade-in slide-in-from-top-2 shadow-inner"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-2 select-none">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
              TLDR Summary
            </span>
            <div className="h-px bg-slate-800/60 flex-grow" />
            {item.hot && (
              <span className="text-[9px] font-black uppercase text-violet-405 tracking-widest animate-pulse">
                Matt Wolfe Recommendation
              </span>
            )}
          </div>
          <p className="font-medium text-slate-300 selection:bg-violet-500/20">{item.summary}</p>
          {item.relatedCoverage && item.relatedCoverage.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-2 select-none">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Also covered by</span>
              {item.relatedCoverage.map((r) => (
                <a
                  key={r.url}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/15 rounded-full px-2.5 py-0.5 transition-colors"
                >
                  {r.source} ↗
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

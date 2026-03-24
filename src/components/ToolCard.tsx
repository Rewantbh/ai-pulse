import { ToolItem } from "@/lib/tools-fetcher";

export function ToolCard({ tool }: { tool: ToolItem }) {
  const pricingClass = {
    Free: "tag-free",
    Freemium: "tag-freemium",
    Paid: "tag-paid",
    Unknown: "tag-unknown",
  }[tool.pricing];

  return (
    <div 
      className="card-future p-5 flex flex-col gap-3 cursor-pointer group"
      onClick={() => window.open(tool.link, "_blank")}
    >
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-bold text-lg text-white group-hover:text-violet-400 transition-colors leading-tight">
          {tool.name}
        </h3>
        <span className={`tag-pricing ${pricingClass}`}>
          {tool.pricing === "Unknown" ? "Check Price" : tool.pricing.toUpperCase()}
        </span>
      </div>
      
      <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
        {tool.description}
      </p>
      
      <div className="mt-auto pt-4 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {tool.category}
        </span>
        <div className="flex items-center gap-1 text-violet-400 group-hover:translate-x-1 transition-transform">
          <span className="text-[10px] font-bold uppercase tracking-widest">Visit</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </div>
      </div>
    </div>
  );
}

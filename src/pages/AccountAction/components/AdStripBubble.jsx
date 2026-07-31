export default function AdStripBubble({ news }) {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,46,0.04)]"
      style={{ borderRadius: "16px" }}
    >
      <span className="mt-0.5 shrink-0 text-[22px] leading-none" aria-hidden="true">
        🔑
      </span>
      <p className="min-w-0 flex-1 whitespace-pre-line text-[13px] font-bold leading-snug text-[#191f28]">
        {news.text}
      </p>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-[10px] font-medium text-[#b0b8c1]">광고</span>
        <a href={news.href} target="_blank" rel="noreferrer" className="text-[13px] font-bold text-[#3b6cff]">
          {news.linkLabel} ↗
        </a>
      </div>
    </div>
  );
}

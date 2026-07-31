import { ChevronRight } from "lucide-react";

export default function IntakeSection({ icon: Icon, label, summary, filled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[20px] bg-white px-4 py-4 text-left shadow-[0_2px_10px_rgba(16,24,46,0.06)] ring-1 ring-[#eef0f5] transition-colors active:bg-[#f8faff]"
      style={{ borderRadius: "20px" }}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
          filled ? "bg-[#08257e]" : "bg-[#eef1f7]"
        }`}
        style={{ borderRadius: "9999px" }}
      >
        <Icon size={16} className={filled ? "text-white" : "text-[#4e5968]"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold text-[#191f28]">{label}</span>
        {summary != null && (
          <span className="mt-0.5 block truncate text-[12px] font-medium text-[#8b95a1]">{summary}</span>
        )}
      </span>
      <ChevronRight size={16} strokeWidth={2.25} className="shrink-0 text-[#b0b8c1]" />
    </button>
  );
}

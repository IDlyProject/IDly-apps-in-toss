import { Check, X } from "lucide-react";

export default function QuickReplyBubble({ onSelect }) {
  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => onSelect?.("done")}
        className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[13px] font-bold text-[#191f28] shadow-[0_1px_2px_rgba(16,24,46,0.08)]"
        style={{ borderRadius: "9999px" }}
      >
        <Check size={14} className="text-[#43a047]" />
        조치를 완료했어요!
      </button>
      <button
        type="button"
        onClick={() => onSelect?.("failed")}
        className="flex items-center gap-1.5 rounded-full bg-[#08257e] px-4 py-2.5 text-[13px] font-bold text-white"
        style={{ borderRadius: "9999px" }}
      >
        <X size={14} />
        조치하지 못했어요
      </button>
    </div>
  );
}

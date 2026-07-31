import { CheckCircle2 } from "lucide-react";

export default function TipBubble({ text }) {
  return (
    <div className="rounded-2xl bg-[#e8f5e9] p-4" style={{ borderRadius: "16px" }}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <CheckCircle2 size={16} className="text-[#43a047]" />
        <span className="text-[13px] font-bold text-[#43a047]">보안 팁</span>
      </div>
      <p className="whitespace-pre-line break-words text-[13px] font-medium leading-relaxed text-[#191f28]">{text}</p>
    </div>
  );
}

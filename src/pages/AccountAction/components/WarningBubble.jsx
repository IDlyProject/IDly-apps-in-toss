import { AlertTriangle } from "lucide-react";

export default function WarningBubble({ title = "보안 위험 감지", description }) {
  return (
    <div
      className="rounded-2xl bg-gradient-to-b from-[#f3e3e7] to-[#fbeef0] p-4"
      style={{ borderRadius: "16px" }}
    >
      <div className="flex items-center gap-2 rounded-xl bg-[#ee4e4e] px-4 py-3" style={{ borderRadius: "12px" }}>
        <AlertTriangle size={18} className="shrink-0 text-white" />
        <span className="text-[14px] font-bold text-white">{title}</span>
      </div>
      <p className="mt-3 whitespace-pre-line break-words text-[13px] font-bold leading-relaxed text-[#191f28]">
        {description}
      </p>
    </div>
  );
}

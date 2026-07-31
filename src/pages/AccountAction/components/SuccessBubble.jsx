import { CheckCircle2 } from "lucide-react";

export default function SuccessBubble({ serviceName = "", description, title }) {
  return (
    <div className="rounded-2xl bg-[#e8f5e9] p-4" style={{ borderRadius: "16px" }}>
      <div className="flex items-center gap-1.5">
        <CheckCircle2 size={18} className="shrink-0 text-[#43a047]" />
        <span className="text-[15px] font-bold text-[#191f28]">
          {title ?? `${serviceName} 계정이 안전해졌어요!`}
        </span>
      </div>
      <p className="mt-1.5 whitespace-pre-line break-words text-[13px] font-medium leading-relaxed text-[#4e5968]">
        {description}
      </p>
    </div>
  );
}

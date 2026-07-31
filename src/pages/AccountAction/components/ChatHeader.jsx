import { ChevronLeft } from "lucide-react";

export default function ChatHeader({ title, onBack }) {
  return (
    <header className="flex items-center gap-3 px-4 py-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="뒤로 가기"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#191f28] shadow-[0_1px_2px_rgba(16,24,46,0.08)]"
        style={{ borderRadius: "9999px" }}
      >
        <ChevronLeft size={20} strokeWidth={2.5} />
      </button>
      <h1 className="text-[17px] font-bold text-[#191f28]">{title}</h1>
    </header>
  );
}

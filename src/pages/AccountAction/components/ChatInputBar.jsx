import { ArrowUp } from "lucide-react";

export default function ChatInputBar({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "메시지를 입력하세요",
}) {
  return (
    <div className="flex items-center gap-2 border-t border-[#e5e8ee] bg-white px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !disabled) {
            onSend();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="h-11 min-w-0 flex-1 rounded-full bg-[#f2f4f8] px-4 text-[14px] text-[#191f28] outline-none placeholder:text-[#b0b8c1]"
        style={{ borderRadius: "9999px" }}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled}
        aria-label="보내기"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#08257e] text-white disabled:opacity-50"
        style={{ borderRadius: "9999px" }}
      >
        <ArrowUp size={20} />
      </button>
    </div>
  );
}

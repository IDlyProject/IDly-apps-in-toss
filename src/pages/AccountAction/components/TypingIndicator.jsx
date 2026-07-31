import OwlAvatar from "./OwlAvatar";

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5">
      <OwlAvatar />
      <div
        className="flex items-center gap-1 rounded-[4px_18px_18px_18px] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,46,0.04)]"
        style={{ borderRadius: "4px 18px 18px 18px" }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#c1c7d0]"
          style={{
            borderRadius: "9999px",
            animation: "typing-dot 1.2s ease-out infinite",
            animationDelay: "-0.3s",
          }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#c1c7d0]"
          style={{
            borderRadius: "9999px",
            animation: "typing-dot 1.2s ease-out infinite",
            animationDelay: "-0.15s",
          }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#c1c7d0]"
          style={{ borderRadius: "9999px", animation: "typing-dot 1.2s ease-out infinite" }}
        />
      </div>
    </div>
  );
}

export default function TextBubble({ text }) {
  return (
    <div
      className="max-w-[280px] rounded-[4px_18px_18px_18px] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,46,0.04)]"
      style={{ borderRadius: "4px 18px 18px 18px" }}
    >
      <p className="whitespace-pre-line break-words text-[13px] font-bold leading-relaxed text-[#191f28]">{text}</p>
    </div>
  );
}

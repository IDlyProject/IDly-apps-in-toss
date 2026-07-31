export default function UserBubble({ text }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[80%] break-words rounded-full bg-[#08257e] px-5 py-3 text-[14px] font-bold leading-relaxed text-white"
        style={{ borderRadius: "9999px" }}
      >
        {text}
      </div>
    </div>
  );
}

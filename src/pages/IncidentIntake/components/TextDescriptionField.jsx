export default function TextDescriptionField({ message, onMessageChange, textLength, nearLimit, maxTextLength }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-end">
        <span className={`text-[11px] font-medium ${nearLimit ? "text-[#ee4e4e]" : "text-[#94a3b8]"}`}>
          {textLength.toLocaleString()} / {maxTextLength.toLocaleString()}
        </span>
      </div>
      <textarea
        id="incident-message"
        value={message}
        onChange={(event) => onMessageChange(event.target.value)}
        maxLength={maxTextLength}
        placeholder="예: 신한카드에서 카드정보 유출 안내 문자를 받았어요."
        rows={4}
        className="w-full resize-none rounded-[12px] border border-[#d1d6db] bg-white p-3 text-[14px] leading-relaxed text-[#191f28] outline-none transition-colors focus:border-[#08257e] focus-visible:ring-2 focus-visible:ring-[#08257e]/15"
        style={{ borderRadius: "12px" }}
      />
    </div>
  );
}

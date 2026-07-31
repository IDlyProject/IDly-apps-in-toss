import { Check, RefreshCcw, ScanLine, X } from "lucide-react";

export default function ImageCaptureField({ image, imagePreviewUrl, fileInputRef, onFileChange, onRemoveImage }) {
  return (
    <>
      {image == null ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="문자·알림 캡처 이미지 선택하기"
          className="flex w-full flex-col items-center gap-2 rounded-[16px] border border-dashed border-[#d1d6db] bg-[#fafbfc] px-4 py-8 text-center transition-colors active:bg-[#f2f4f6]"
          style={{ borderRadius: "16px" }}
        >
          <ScanLine size={22} strokeWidth={1.75} className="text-[#8b95a1]" />
          <strong className="mt-1 text-[14px] font-bold text-[#191f28]">문자 · 알림 캡처 첨부하기</strong>
          <span className="text-[12px] font-medium leading-relaxed text-[#6b7684]">
            받은 문자·이메일 스크린샷을 그대로 올려주세요
          </span>
        </button>
      ) : (
        <div
          className="flex items-center gap-3 rounded-[16px] border border-[#e5e8eb] bg-[#f8faff] p-3"
          style={{ borderRadius: "16px" }}
        >
          <div className="relative shrink-0">
            <img
              src={imagePreviewUrl}
              alt=""
              className="h-16 w-16 rounded-[12px] object-cover"
              style={{ borderRadius: "12px" }}
            />
            <span
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#08257e] text-white ring-2 ring-[#f8faff]"
              style={{ borderRadius: "9999px" }}
            >
              <Check size={11} strokeWidth={3} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-[#191f28]">{image.name}</p>
            <p className="text-[12px] font-medium text-[#6b7684]">
              {formatFileSize(image.size)} · 첨부 완료
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="다른 캡처로 변경"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#6b7684] shadow-[0_1px_2px_rgba(16,24,46,0.08)] transition-colors active:bg-[#f2f4f8]"
              style={{ borderRadius: "9999px" }}
            >
              <RefreshCcw size={14} />
            </button>
            <button
              type="button"
              onClick={onRemoveImage}
              aria-label="첨부 이미지 삭제"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#6b7684] shadow-[0_1px_2px_rgba(16,24,46,0.08)] transition-colors active:bg-[#f2f4f8]"
              style={{ borderRadius: "9999px" }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
    </>
  );
}

export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";

export default function ExternalAiConsentSheet({ open, imageAttached, onAgree, onClose }) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-200 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-[#0b1220]/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-sheet-title"
        className={`relative w-full max-w-[480px] rounded-t-[28px] bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(16,24,40,0.18)] transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ borderTopLeftRadius: "28px", borderTopRightRadius: "28px" }}
      >
        <div
          className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#e5e8eb]"
          style={{ borderRadius: "9999px" }}
        />

        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[#08257e]"
            style={{ borderRadius: "9999px" }}
          >
            <ShieldCheck size={20} />
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <h2 id="consent-sheet-title" className="text-[17px] font-extrabold text-[#191f28]">
              외부 AI 분석 동의가 필요해요
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b7684]" style={{ marginTop: "6px" }}>
              입력한 내용{imageAttached ? "과 첨부한 이미지는" : "은"} 유출 유형 분석을 위해 외부 AI
              서비스(업스테이지)로 전송돼요. 동의해야 대응 분석을 시작할 수 있어요.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onAgree}
            className="w-full rounded-full bg-[#08257e] py-3.5 text-[15px] font-bold text-white transition-opacity active:opacity-85"
            style={{ borderRadius: "9999px" }}
          >
            동의하고 계속하기
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full py-3.5 text-[14px] font-bold text-[#6b7684] transition-colors active:bg-[#f2f4f6]"
            style={{ borderRadius: "9999px" }}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

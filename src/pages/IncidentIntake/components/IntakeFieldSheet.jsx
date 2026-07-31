import { forwardRef, useEffect } from "react";
import { X } from "lucide-react";

const IntakeFieldSheet = forwardRef(function IntakeFieldSheet(
  { open, icon: Icon, title, onClose, children },
  bodyRef,
) {
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
        aria-labelledby="intake-sheet-title"
        className={`relative flex max-h-[85dvh] w-full max-w-[480px] flex-col rounded-t-[28px] bg-white pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(16,24,40,0.18)] transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ borderTopLeftRadius: "28px", borderTopRightRadius: "28px" }}
      >
        <div
          className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-[#e5e8eb]"
          style={{ borderRadius: "9999px" }}
        />

        <div className="flex shrink-0 items-center gap-3 px-5 pb-4 pt-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[#08257e]"
            style={{ borderRadius: "9999px" }}
          >
            <Icon size={18} />
          </span>
          <h2 id="intake-sheet-title" className="min-w-0 flex-1 truncate text-[17px] font-extrabold text-[#191f28]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8b95a1] transition-colors active:bg-[#f2f4f6]"
            style={{ borderRadius: "9999px" }}
          >
            <X size={16} />
          </button>
        </div>

        <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-2">
          {children}
        </div>
      </div>
    </div>
  );
});

export default IntakeFieldSheet;

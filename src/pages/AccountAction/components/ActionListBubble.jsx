import { Check, ChevronRight, Copy, Key, LogOut, Phone, ShieldCheck } from "lucide-react";

const ICONS = {
  password: Key,
  twofactor: ShieldCheck,
  logout: LogOut,
  tel: Phone,
  copy: Copy,
};

export default function ActionListBubble({ title, actions, onSelect }) {
  return (
    <div
      className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,46,0.04)]"
      style={{ borderRadius: "16px" }}
    >
      {title && <h2 className="mb-3 text-[15px] font-bold text-[#191f28]">{title}</h2>}
      <div className="flex flex-col gap-2">
        {actions.map((action) => {
          const Icon = ICONS[action.icon] ?? Key;
          const done = action.status === "done";

          return (
            <button
              key={action.id}
              type="button"
              disabled={done}
              onClick={() => onSelect?.(action.id)}
              className="flex items-center gap-3 rounded-xl bg-[#f2f4f8] px-3 py-3 text-left disabled:cursor-default"
              style={{ borderRadius: "12px" }}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  done ? "bg-[#43a047]" : "bg-[#08257e]"
                }`}
                style={{ borderRadius: "8px" }}
              >
                {done ? (
                  <Check size={18} className="text-white" />
                ) : (
                  <Icon size={18} className="text-white" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-[14px] font-bold text-[#191f28]">{action.title}</span>
                <span className="block break-words text-[12px] font-medium text-[#6b7684]">
                  {done ? "완료됨" : action.subtitle}
                </span>
              </span>
              {done ? (
                <Check size={18} className="shrink-0 text-[#43a047]" />
              ) : (
                <ChevronRight size={18} className="shrink-0 text-[#b0b8c1]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

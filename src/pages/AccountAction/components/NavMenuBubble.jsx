import { BarChart3, ChevronRight, Home, Lock } from "lucide-react";

const STYLES = {
  home: { Icon: Home, bg: "bg-[#eef0f8]", fg: "text-[#4e5968]" },
  security: { Icon: Lock, bg: "bg-[#e8f5e9]", fg: "text-[#43a047]" },
  report: { Icon: BarChart3, bg: "bg-[#e8eeff]", fg: "text-[#1a6fdb]" },
};

export default function NavMenuBubble({ items, onSelect }) {
  return (
    <div
      className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,24,46,0.04)]"
      style={{ borderRadius: "16px" }}
    >
      {items.map((item, index) => {
        const style = STYLES[item.icon] ?? STYLES.home;
        const Icon = style.Icon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            className={`flex w-full items-center gap-3 px-4 py-4 text-left active:bg-[#f8f9fb] ${
              index > 0 ? "border-t border-[#f0f1f4]" : ""
            }`}
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.bg}`}
              style={{ borderRadius: "12px" }}
            >
              <Icon size={20} className={style.fg} />
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-bold text-[#191f28]">{item.label}</span>
            <ChevronRight size={18} className="shrink-0 text-[#b0b8c1]" />
          </button>
        );
      })}
    </div>
  );
}

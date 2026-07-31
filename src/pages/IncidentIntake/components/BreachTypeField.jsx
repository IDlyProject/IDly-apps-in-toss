import { ShieldAlert } from "lucide-react";

export default function BreachTypeField({ types, icons, selectedTypeId, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {types.map((type) => {
        const selected = selectedTypeId === type.id;
        const Icon = icons[type.id] ?? ShieldAlert;

        return (
          <button
            key={type.id}
            type="button"
            onClick={() => onSelect(selected ? null : type.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2.5 text-[13px] font-bold transition-colors ${
              selected
                ? "border-[#08257e] bg-[#08257e] text-white"
                : "border-[#e5e8eb] bg-white text-[#4e5968] active:bg-[#f8faff]"
            }`}
            style={{ borderRadius: "9999px" }}
          >
            <Icon size={14} strokeWidth={2.25} className={selected ? "text-white" : "text-[#8b95a1]"} />
            {type.nameKr}
          </button>
        );
      })}
    </div>
  );
}

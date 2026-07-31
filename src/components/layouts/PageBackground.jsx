export default function PageBackground({ variant = "frost", children }) {
  const background =
    variant === "frost"
      ? "bg-gradient-to-b from-[#eef1f7] to-[#e3e8f2]"
      : "bg-white";

  return <div className={`flex min-h-dvh w-full flex-col ${background}`}>{children}</div>;
}

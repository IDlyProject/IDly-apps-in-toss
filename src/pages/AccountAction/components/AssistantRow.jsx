import OwlAvatar from "./OwlAvatar";

export default function AssistantRow({ showAvatar, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex w-10 shrink-0 justify-center">{showAvatar && <OwlAvatar />}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

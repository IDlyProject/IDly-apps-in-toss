export default function OwlAvatar({ className = "" }) {
  return (
    <img
      src="/owl-avatar.png"
      alt=""
      aria-hidden="true"
      className={`h-10 w-10 shrink-0 select-none object-contain ${className}`}
    />
  );
}

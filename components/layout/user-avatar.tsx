import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Deterministic per-username color so the same account gets the same fallback color everywhere, without storing anything.
const FALLBACK_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
];

function colorForUsername(username: string): string {
  let hash = 0;
  for (const char of username) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length] ?? "bg-muted";
}

function initialsOf(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

export function UserAvatar({
  username,
  avatarUrl,
  size = "default",
}: {
  username: string;
  avatarUrl: string | null;
  size?: "default" | "sm" | "lg";
}): React.ReactElement {
  return (
    <Avatar size={size}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback className={`${colorForUsername(username)} text-white`}>
        {initialsOf(username)}
      </AvatarFallback>
    </Avatar>
  );
}

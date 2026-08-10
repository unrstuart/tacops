import { Icon } from "./Icon";

interface IconBadgeProps {
  src: string;
  title?: string;
  badgeText: string;
}

export function IconBadge({ src, title, badgeText }: IconBadgeProps) {
  return (
    <span className="relative inline-flex" title={title}>
      <Icon src={src} />
      <span className="absolute -right-1 -bottom-1 flex h-3 w-3 items-center justify-center rounded-full bg-white text-[9px] leading-3 font-bold text-red-600">
        {badgeText}
      </span>
    </span>
  );
}

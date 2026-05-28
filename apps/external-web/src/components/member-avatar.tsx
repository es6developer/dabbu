"use client";

import { cn, getInitials, getRandomColor } from "@/lib/utils";

interface MemberAvatarProps {
  name: string;
  avatar?: string;
  isOnline?: boolean;
  balance?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showIndicator?: boolean;
}

const sizeClasses = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
};

const indicatorSizes = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
  xl: "w-3.5 h-3.5",
};

export function MemberAvatar({
  name,
  avatar,
  isOnline,
  balance,
  size = "md",
  className,
  showIndicator = true,
}: MemberAvatarProps) {
  const bgColor = getRandomColor(name);

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className={cn("rounded-full object-cover", sizeClasses[size])}
        />
      ) : (
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-bold text-white",
            sizeClasses[size]
          )}
          style={{ backgroundColor: bgColor }}
        >
          {getInitials(name)}
        </div>
      )}

      {showIndicator && (
        <>
          {isOnline !== undefined && (
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-dabbu-bg",
                indicatorSizes[size],
                isOnline ? "bg-dabbu-green" : "bg-dabbu-text-muted"
              )}
            />
          )}
          {balance !== undefined && balance !== 0 && (
            <span
              className={cn(
                "absolute -top-1 -right-1 text-xs font-bold px-1 rounded-full border-2 border-dabbu-bg",
                balance > 0
                  ? "bg-dabbu-green text-white"
                  : "bg-dabbu-red text-white"
              )}
            >
              {balance > 0 ? "+" : ""}
              {balance.toFixed(0).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")}
            </span>
          )}
        </>
      )}
    </div>
  );
}

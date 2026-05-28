import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-dabbu-text-secondary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dabbu-text-muted">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-12 w-full rounded-lg border border-dabbu-border bg-dabbu-surface px-4 py-2 text-sm text-dabbu-text placeholder:text-dabbu-text-muted focus:outline-none focus:ring-2 focus:ring-dabbu-accent focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all",
              icon && "pl-10",
              error && "border-dabbu-red focus:ring-dabbu-red",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-xs text-dabbu-red">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };

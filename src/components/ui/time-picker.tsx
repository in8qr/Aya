"use client";

import * as React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export interface TimePickerProps {
  value?: string; // HH:mm or HH:mm:ss
  onChange?: (value: string) => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  showSeconds?: boolean;
  className?: string;
}

function parseTime(v: string): {
  hour: number;
  minute: number;
  second: number;
  pm: boolean;
} {
  if (!v || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(v)) {
    return { hour: 12, minute: 0, second: 0, pm: false };
  }
  const parts = v.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const s = parts[2] ? parseInt(parts[2], 10) : 0;
  const hour24 = clamp(h, 0, 23);
  return {
    hour: hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24,
    minute: clamp(m, 0, 59),
    second: clamp(s, 0, 59),
    pm: hour24 >= 12,
  };
}

function to24h(hour12: number, pm: boolean): number {
  if (pm) return hour12 === 12 ? 12 : hour12 + 12;
  return hour12 === 12 ? 0 : hour12;
}

function formatTimeValue(n: number, pad = 2): string {
  return n.toString().padStart(pad, "0");
}

export function TimePicker({
  value,
  onChange,
  onCancel,
  onConfirm,
  showSeconds = false,
  className,
}: TimePickerProps) {
  const parsed = parseTime(value ?? "");
  const [hour, setHour] = React.useState(parsed.hour);
  const [minute, setMinute] = React.useState(parsed.minute);
  const [second, setSecond] = React.useState(parsed.second);
  const [pm, setPm] = React.useState(parsed.pm);

  const commit = React.useCallback(() => {
    const h24 = to24h(hour, pm);
    const str = showSeconds
      ? `${formatTimeValue(h24)}:${formatTimeValue(minute)}:${formatTimeValue(second)}`
      : `${formatTimeValue(h24)}:${formatTimeValue(minute)}`;
    onChange?.(str);
  }, [hour, minute, second, pm, showSeconds, onChange]);

  const handleOk = () => {
    commit();
    onConfirm?.();
  };

  const displayTime = `${hour}:${formatTimeValue(minute)}${showSeconds ? `:${formatTimeValue(second)}` : ""} ${pm ? "PM" : "AM"}`;

  const spinner = (label: string, val: number, min: number, max: number, set: (n: number) => void) => (
    <div className="flex flex-col items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full"
        onClick={() => set(clamp(val + 1, min, max))}
        aria-label={`Increase ${label}`}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <span className="text-lg font-medium tabular-nums w-8 text-center">{val}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full"
        onClick={() => set(clamp(val - 1, min, max))}
        aria-label={`Decrease ${label}`}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="text-sm font-semibold text-foreground text-center">Time</div>
      <div className="flex items-center justify-center gap-4" dir="ltr">
        {spinner("hour", hour, 1, 12, setHour)}
        {spinner("min", minute, 0, 59, setMinute)}
        {showSeconds && spinner("sec", second, 0, 59, setSecond)}
      </div>
      <div className="flex rounded-md border border-input bg-background p-0.5">
        <button
          type="button"
          onClick={() => setPm(false)}
          className={cn(
            "flex-1 rounded py-1.5 text-sm font-medium transition-colors",
            !pm ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
          )}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => setPm(true)}
          className={cn(
            "flex-1 rounded py-1.5 text-sm font-medium transition-colors",
            pm ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
          )}
        >
          PM
        </button>
      </div>
      <div className="text-center text-sm text-muted-foreground">{displayTime}</div>
      <div className="flex flex-col gap-2">
        <Button type="button" size="sm" onClick={handleOk}>
          OK
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

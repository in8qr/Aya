"use client";

import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";

function formatDate(value: string): string {
  if (!value) return "";
  const d = parseISO(value);
  return isValid(d) ? format(d, "MMM d, yyyy") : value;
}

function formatTime(value: string): string {
  if (!value) return "";
  const parts = value.trim().split(":");
  if (parts.length < 2) return value;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const s = parts[2] ?? "";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${hour12}:${m}${s ? `:${s}` : ""} ${ampm}`;
}

const triggerClass =
  "flex h-10 w-full min-w-[10rem] cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value = "", onChange, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const handleChange = (v: string) => {
      onChange?.({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>);
    };
    return (
      <>
        <input type="hidden" ref={ref} value={value} readOnly {...props} />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={cn(triggerClass, "min-w-[10.5rem]", className)}>
              <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className={value ? "text-foreground" : "text-muted-foreground"}>
                {value ? formatDate(value) : "Select date"}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-lg border border-border bg-popover p-4" align="start">
            <CalendarPicker
              value={value}
              onChange={handleChange}
              onCancel={() => setOpen(false)}
              onConfirm={() => setOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </>
    );
  }
);
DateInput.displayName = "DateInput";

export interface TimeInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showSeconds?: boolean;
}

const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ className, value = "", onChange, showSeconds, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const handleChange = (v: string) => {
      onChange?.({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>);
    };
    return (
      <>
        <input type="hidden" ref={ref} value={value} readOnly {...props} />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={cn(triggerClass, "min-w-[8rem]", className)}>
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className={value ? "text-foreground" : "text-muted-foreground"}>
                {value ? formatTime(value) : "Select time"}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-lg border border-border bg-popover p-4" align="start">
            <TimePicker
              value={value}
              onChange={handleChange}
              onCancel={() => setOpen(false)}
              onConfirm={() => setOpen(false)}
              showSeconds={showSeconds}
            />
          </PopoverContent>
        </Popover>
      </>
    );
  }
);
TimeInput.displayName = "TimeInput";

export interface DateTimeInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value?: string; // ISO datetime or "YYYY-MM-DDTHH:mm" / "YYYY-MM-DDTHH:mm:ss"
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showSeconds?: boolean;
}

const DateTimeInput = React.forwardRef<HTMLInputElement, DateTimeInputProps>(
  ({ className, value = "", onChange, showSeconds, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const datePart = value ? value.slice(0, 10) : "";
    const timePart = value && value.length > 11 ? value.slice(11, 19) : ""; // HH:mm or HH:mm:ss
    const handleDateChange = (d: string) => {
      const t = value && value.length > 11 ? value.slice(11) : "00:00";
      onChange?.({ target: { value: `${d}T${t}` } } as React.ChangeEvent<HTMLInputElement>);
    };
    const handleTimeChange = (t: string) => {
      const d = datePart || new Date().toISOString().slice(0, 10);
      onChange?.({ target: { value: `${d}T${t}` } } as React.ChangeEvent<HTMLInputElement>);
    };
    const display =
      datePart && timePart
        ? `${formatDate(datePart)} ${formatTime(timePart)}`
        : datePart
          ? formatDate(datePart)
          : timePart
            ? formatTime(timePart)
            : "";
    return (
      <>
        <input type="hidden" ref={ref} value={value} readOnly {...props} />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={cn(triggerClass, "min-w-[14rem]", className)}>
              <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className={value ? "text-foreground" : "text-muted-foreground"}>
                {display || "Select date & time"}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-lg border border-border bg-popover p-4" align="start">
            <div className="flex flex-col gap-4">
              <CalendarPicker
                value={datePart}
                onChange={handleDateChange}
                onCancel={() => setOpen(false)}
              />
              <TimePicker
                value={timePart}
                onChange={handleTimeChange}
                onCancel={() => setOpen(false)}
                onConfirm={() => setOpen(false)}
                showSeconds={showSeconds}
              />
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                onClick={() => setOpen(false)}
              >
                OK
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </>
    );
  }
);
DateTimeInput.displayName = "DateTimeInput";

export { DateInput, TimeInput, DateTimeInput };

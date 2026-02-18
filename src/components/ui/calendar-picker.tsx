"use client";

import * as React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  addDays,
  parseISO,
  isValid,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export interface CalendarPickerProps {
  value?: string; // ISO date string YYYY-MM-DD
  onChange?: (value: string) => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  className?: string;
}

export function CalendarPicker({
  value,
  onChange,
  onCancel,
  onConfirm,
  className,
}: CalendarPickerProps) {
  const initial = value && isValid(parseISO(value)) ? parseISO(value) : new Date();
  const [viewMonth, setViewMonth] = React.useState(initial);
  const [selected, setSelected] = React.useState<Date | null>(
    value && isValid(parseISO(value)) ? parseISO(value) : null
  );

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const handleSelect = (day: Date) => {
    setSelected(day);
    onChange?.(format(day, "yyyy-MM-dd"));
  };

  const handleOk = () => {
    if (selected) onChange?.(format(selected, "yyyy-MM-dd"));
    onConfirm?.();
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground">
          {format(viewMonth, "MMMM yyyy")}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1 text-muted-foreground font-medium">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const isSelected = selected ? isSameDay(day, selected) : false;
          return (
            <button
              key={day.getTime()}
              type="button"
              onClick={() => handleSelect(day)}
              className={cn(
                "h-8 w-8 rounded-md text-sm transition-colors",
                !inMonth && "text-muted-foreground",
                inMonth && "text-foreground hover:bg-accent",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleOk}>
          OK
        </Button>
      </div>
    </div>
  );
}

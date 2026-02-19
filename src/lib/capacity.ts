/**
 * Capacity and availability logic for bookings.
 * - Pending bookings do NOT consume capacity.
 * - Only CONFIRMED bookings consume capacity.
 * - Submission blocked if: day/time non-bookable, or ConfirmedCount >= TeamCapacity.
 * - TeamCapacity = ActiveTeamMembers - UnavailableMembers (on that day) + DailyOverride (for that day).
 */

import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";

export type CapacityCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Check if a given date/time range is blocked (full day or partial).
 */
export async function isTimeBlocked(
  startAt: Date,
  endAt: Date
): Promise<{ blocked: boolean; fullDay?: boolean; reason?: string }> {
  const dayStart = startOfDay(startAt);
  const dayEnd = endOfDay(startAt);

  const blocks = await prisma.dayBlock.findMany({
    where: {
      day: { gte: dayStart, lte: dayEnd },
    },
  });

  for (const block of blocks) {
    if (block.fullDay) {
      return { blocked: true, fullDay: true, reason: block.reason ?? "Day is blocked" };
    }
    const blockStart = block.startAt ?? dayStart;
    const blockEnd = block.endAt ?? dayEnd;
    const range = { start: blockStart, end: blockEnd };
    if (
      isWithinInterval(startAt, range) ||
      isWithinInterval(endAt, range) ||
      (startAt <= blockStart && endAt >= blockEnd)
    ) {
      return { blocked: true, fullDay: false, reason: block.reason ?? "Time range is blocked" };
    }
  }
  return { blocked: false };
}

/**
 * Get effective team capacity for a given day.
 * TeamCapacity = ActiveTeamMembers - UnavailableMembers (that day), then overridden by DailyOverride if set.
 */
export async function getTeamCapacityForDay(day: Date): Promise<number> {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  const override = await prisma.capacityOverride.findUnique({
    where: { day: dayStart },
  });
  if (override != null) {
    return Math.max(0, override.capacity);
  }

  const activeTeamIds = await prisma.user.findMany({
    where: { role: "TEAM", active: true },
    select: { id: true },
  });
  const activeTeamCount = activeTeamIds.length;

  const unavailableTeamIds = await prisma.teamUnavailable.findMany({
    where: {
      startAt: { lte: dayEnd },
      endAt: { gte: dayStart },
    },
    select: { teamUserId: true },
    distinct: ["teamUserId"],
  });
  const unavailableCount = unavailableTeamIds.length;

  const capacity = Math.max(0, activeTeamCount - unavailableCount);
  // When no team members exist yet, allow at least 1 booking request so admin can assign later
  return capacity === 0 ? 1 : capacity;
}

/**
 * Count CONFIRMED bookings that overlap the given [startAt, endAt].
 * Overlap: booking.startAt < endAt && (booking.startAt + duration) > startAt.
 */
export async function countConfirmedOverlapping(
  startAt: Date,
  endAt: Date,
  excludeBookingId?: string
): Promise<number> {
  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      startAt: { lt: endAt },
    },
    select: {
      id: true,
      startAt: true,
      durationMinutes: true,
    },
  });

  let count = 0;
  for (const b of bookings) {
    const bEnd = new Date(b.startAt.getTime() + b.durationMinutes * 60 * 1000);
    if (bEnd > startAt) count++;
  }
  return count;
}

function getBookingEnd(startAt: Date, durationMinutes: number): Date {
  return new Date(startAt.getTime() + durationMinutes * 60 * 1000);
}

/**
 * Main capacity check: can we allow a new booking (or keep this one) at startAt for durationMinutes?
 * Returns allowed: true or { allowed: false, reason }.
 */
export async function checkCapacity(
  startAt: Date,
  durationMinutes: number,
  excludeBookingId?: string
): Promise<CapacityCheckResult> {
  const endAt = getBookingEnd(startAt, durationMinutes);

  const block = await isTimeBlocked(startAt, endAt);
  if (block.blocked) {
    return {
      allowed: false,
      reason: block.reason ?? (block.fullDay ? "This day is not bookable." : "This time range is not bookable."),
    };
  }

  const day = startOfDay(startAt);
  const teamCapacity = await getTeamCapacityForDay(day);
  const confirmedCount = await countConfirmedOverlapping(
    startAt,
    endAt,
    excludeBookingId
  );

  if (confirmedCount >= teamCapacity) {
    return {
      allowed: false,
      reason: "No capacity available for this date and time. Please choose another slot.",
    };
  }

  return { allowed: true };
}

/**
 * Check if a day has partial blocking (some but not all slots blocked).
 * Used to show a warning to the user.
 */
export async function getDayBlockingWarning(day: Date): Promise<string | null> {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  const blocks = await prisma.dayBlock.findMany({
    where: {
      day: { gte: dayStart, lte: dayEnd },
    },
  });

  const hasFullDay = blocks.some((b) => b.fullDay);
  if (hasFullDay) return "This day is fully blocked.";
  const hasPartial = blocks.length > 0;
  if (hasPartial) return "Some time slots on this day are blocked. Please choose an available time.";
  return null;
}

export interface SnoozeOption {
  label: string;
  until: Date;
}

/** `days` from today at `hour`:00 local time. */
function at(days: number, hour: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

export function tomorrowMorning(): Date {
  return at(1, 9);
}

export function snoozeOptions(): SnoozeOption[] {
  const now = new Date();
  const options: SnoozeOption[] = [{ label: "In 1 hour", until: new Date(now.getTime() + 3_600_000) }];
  if (now.getHours() < 17) options.push({ label: "This evening", until: at(0, 18) });
  options.push({ label: "Tomorrow", until: tomorrowMorning() });
  const daysToMonday = (8 - now.getDay()) % 7 || 7;
  options.push({ label: "Next week", until: at(daysToMonday, 9) });
  return options;
}

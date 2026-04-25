import { differenceInYears, format, isValid, parseISO } from 'date-fns';

export const ageFromBirthdate = (birthdateIso: string, now: Date = new Date()): number => {
  const d = parseISO(birthdateIso);
  if (!isValid(d)) {
    throw new Error(`Invalid birthdate ISO: ${birthdateIso}`);
  }
  return differenceInYears(now, d);
};

export const isAdult = (birthdateIso: string, now: Date = new Date()): boolean =>
  ageFromBirthdate(birthdateIso, now) >= 18;

export const formatChatTimestamp = (iso: string, now: Date = new Date()): string => {
  const d = parseISO(iso);
  if (!isValid(d)) {
    throw new Error(`Invalid ISO timestamp: ${iso}`);
  }
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay ? format(d, 'h:mm a') : format(d, 'MMM d');
};

/** "8 dk", "2 sa 10 dk", "3 gün": time since a pet entered its stage, for board cards */
export function elapsed(since: Date, now = new Date()) {
  const minutes = Math.max(0, Math.floor((now.getTime() - since.getTime()) / 60000));
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours} sa ${minutes % 60} dk` : `${hours} sa`;
  return `${Math.floor(hours / 24)} gün`;
}

/** "Bugün 17:00", "Yarın 10:30", "Cuma 17:00", "3 Kasım" for promised delivery times */
export function whenLabel(at: Date, now = new Date()) {
  const tz = "Europe/Istanbul";
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: tz });
  const time = at.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  const diffDays = Math.round((new Date(day(at)).getTime() - new Date(day(now)).getTime()) / 86400000);
  if (diffDays === 0) return `Bugün ${time}`;
  if (diffDays === 1) return `Yarın ${time}`;
  if (diffDays > 1 && diffDays < 7) return `${at.toLocaleDateString("tr-TR", { weekday: "long", timeZone: tz })} ${time}`;
  return at.toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: tz });
}

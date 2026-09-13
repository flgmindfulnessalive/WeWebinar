// The waiting-room-config "bullets" field is a plain textarea (one item
// per line) with no separate field for a lead-in sentence before the
// list (e.g. "This webinar is for you if:"). Hosts naturally type that
// sentence as the first line, which used to render with the same
// checkmark icon as every other item. A line ending in ":" is instead
// treated as an intro line for the list below it, not a list item itself.
export function isBulletIntroLine(line: string): boolean {
  return line.trim().endsWith(":");
}

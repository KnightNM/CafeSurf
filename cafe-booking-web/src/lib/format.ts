export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function hourLabel(hour: number): string {
  const normalized = hour % 24;
  const suffix = normalized >= 12 ? 'PM' : 'AM';
  return `${normalized % 12 || 12}:00 ${suffix}`;
}

export function largestContiguousBlock(hours: number[]): number[] {
  if (!hours.length) return [];
  const sorted = [...hours].sort((a, b) => a - b);
  const segments: number[][] = [[sorted[0]]];
  for (const hour of sorted.slice(1)) {
    const segment = segments[segments.length - 1];
    if (hour === segment[segment.length - 1] + 1) segment.push(hour);
    else segments.push([hour]);
  }
  return segments.reduce(
    (largest, segment) => (segment.length > largest.length ? segment : largest),
    [] as number[]
  );
}

export function roleLabel(role: string): string {
  return role.replace('_', ' ');
}

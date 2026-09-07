/** Format storage GB for UI — avoid long floats like 0.237209… */
export function formatStorageGb(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) < 0.005) return '0';
  const rounded = Number(value.toFixed(digits));
  return String(rounded);
}

export function formatStorageUsage(usedGB: number, limitGB: number): string {
  return `${formatStorageGb(usedGB)} / ${formatStorageGb(limitGB, 0)} GB`;
}

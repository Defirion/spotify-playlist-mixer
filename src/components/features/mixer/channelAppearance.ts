export const channelColors = [
  '#E4572E',
  '#2BB5A4',
  '#E0A100',
  '#7FA83A',
  '#C9588A',
  '#6C93BF',
];

export function formatMixDuration(ms: number) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  return hours > 0 ? `${hours} h ${totalMinutes % 60} m` : `${totalMinutes} m`;
}

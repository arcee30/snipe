export const STARTING_BALANCE = 1_000_000;

export function assertPositiveCoins(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive whole number of coins`);
  }
}

export function formatCoins(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

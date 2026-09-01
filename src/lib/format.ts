import { site } from "./site.config";

export function money(n: number): string {
  return `${site.currency}${n.toFixed(2)}`;
}

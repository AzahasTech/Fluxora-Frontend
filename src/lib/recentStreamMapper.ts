import { formatUsdc } from "./formatters";

export { formatUsdc };

export interface RecentStreamData {
  id: string;
  name: string;
  recipient: string;
  rate: string;
  status: "Active" | "Paused" | "Completed";
  amount?: number;
  formattedAmount?: string;
}

export function mapRecentStream(stream: RecentStreamData): RecentStreamData {
  return {
    ...stream,
    formattedAmount:
      typeof stream.amount === "number"
        ? formatUsdc(stream.amount)
        : stream.formattedAmount,
  };
}

export function formatTotalStreaming(total: number): string {
  return formatUsdc(total);
}

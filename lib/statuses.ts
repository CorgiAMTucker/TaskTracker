export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type PriorityKey = (typeof PRIORITIES)[number];

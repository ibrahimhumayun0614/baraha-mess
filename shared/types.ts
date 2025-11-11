export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export type MemberType = 'standard' | 'reduced';
export interface Member {
  id: string;
  name: string;
  type: MemberType;
  contribution: number;
}
export interface Expense {
  id:string;
  memberId: string;
  amount: number;
  date: string; // ISO string
  note?: string;
  deviceInfo: string;
}
export interface MessSettings {
  id: 'global'; // Singleton
  standardContribution: number;
  reducedContribution: number;
  totalDays: number;
  initialized: boolean;
}
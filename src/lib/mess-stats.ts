export function getRemainingCycleDays(totalDays: number, today = new Date()): number {
  return Math.max(0, totalDays - (today.getDate() - 1));
}

export function getAdjustedDailyRate(
  balance: number,
  totalDays: number,
  today = new Date()
): { rate: number; remainingDays: number; cycleEnded: boolean } {
  const remainingDays = getRemainingCycleDays(totalDays, today);
  if (remainingDays <= 0) {
    return { rate: 0, remainingDays: 0, cycleEnded: true };
  }
  return { rate: balance / remainingDays, remainingDays, cycleEnded: false };
}

export function getMessPoolBalance(totalContribution: number, totalSpent: number): number {
  return totalContribution - totalSpent;
}

export function getPersonalBalance(contribution: number, totalExpenses: number): number {
  return contribution - totalExpenses;
}

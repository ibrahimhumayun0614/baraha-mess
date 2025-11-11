import { IndexedEntity, Entity } from "./core-utils";
import type { Member, Expense, MessSettings } from "@shared/types";
// MESS SETTINGS ENTITY: Singleton for global settings
export class MessSettingsEntity extends Entity<MessSettings> {
  static readonly entityName = "mess-settings";
  static readonly initialState: MessSettings = {
    id: 'global',
    standardContribution: 450,
    reducedContribution: 250,
    totalDays: 30,
    initialized: false,
  };
  constructor(env: Env) {
    super(env, 'global');
  }
}
// MEMBER ENTITY
export class MemberEntity extends IndexedEntity<Member> {
  static readonly entityName = "member";
  static readonly indexName = "members";
  static readonly initialState: Member = { id: "", name: "", type: 'standard', contribution: 0 };
}
// EXPENSE ENTITY
export class ExpenseEntity extends IndexedEntity<Expense> {
  static readonly entityName = "expense";
  static readonly indexName = "expenses";
  static readonly initialState: Expense = { id: "", memberId: "", amount: 0, date: "", deviceInfo: "" };
}
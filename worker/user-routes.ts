import { Hono } from "hono";
import type { Env } from './core-utils';
import { MessSettingsEntity, MemberEntity, ExpenseEntity, AuditLogEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { Member, MemberType, Expense, AuditLog } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // MESS SETTINGS
  app.post('/api/mess/init', async (c) => {
    const { standardContribution, reducedContribution, totalDays } = await c.req.json();
    if (typeof standardContribution !== 'number' || typeof reducedContribution !== 'number' || typeof totalDays !== 'number') {
      return bad(c, 'Invalid input data');
    }
    const settings = new MessSettingsEntity(c.env);
    await settings.patch({ standardContribution, reducedContribution, totalDays, initialized: true });
    return ok(c, await settings.getState());
  });
  app.get('/api/mess/state', async (c) => {
    const settings = new MessSettingsEntity(c.env);
    const state = await settings.getState();
    const members = await MemberEntity.list(c.env);
    const expenses = await ExpenseEntity.list(c.env);
    return ok(c, { settings: state, members: members.items, expenses: expenses.items });
  });
  // MEMBERS
  app.get('/api/members', async (c) => {
    const page = await MemberEntity.list(c.env);
    return ok(c, page.items);
  });
  app.post('/api/members', async (c) => {
    const { name, type } = (await c.req.json()) as { name?: string; type?: MemberType };
    if (!isStr(name) || !['standard', 'reduced'].includes(type!)) return bad(c, 'Name and type are required');
    const settings = await new MessSettingsEntity(c.env).getState();
    const contribution = type === 'standard' ? settings.standardContribution : settings.reducedContribution;
    const member: Member = { id: crypto.randomUUID(), name, type: type!, contribution };
    await MemberEntity.create(c.env, member);
    return ok(c, member);
  });
  app.put('/api/members/:id', async (c) => {
    const id = c.req.param('id');
    const { name, type, contribution } = (await c.req.json()) as Partial<Member>;
    if (!isStr(name) && !isStr(type) && typeof contribution !== 'number') {
      return bad(c, 'At least one field (name, type, contribution) is required');
    }
    const memberEntity = new MemberEntity(c.env, id);
    if (!(await memberEntity.exists())) return notFound(c, 'Member not found');
    const updatePayload: Partial<Member> = {};
    if (name) updatePayload.name = name;
    if (type) updatePayload.type = type;
    // Allow manual override of contribution
    if (typeof contribution === 'number') {
      updatePayload.contribution = contribution;
    } else if (type) {
      // If type is changed but not contribution, recalculate contribution
      const settings = await new MessSettingsEntity(c.env).getState();
      updatePayload.contribution = type === 'standard' ? settings.standardContribution : settings.reducedContribution;
    }
    await memberEntity.patch(updatePayload);
    return ok(c, await memberEntity.getState());
  });
  app.delete('/api/members/:id', async (c) => {
    const id = c.req.param('id');
    const deleted = await MemberEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });
  // EXPENSES
  app.get('/api/expenses', async (c) => {
    const page = await ExpenseEntity.list(c.env);
    return ok(c, page.items);
  });
  app.post('/api/expenses', async (c) => {
    const { memberId, amount, date, note, deviceInfo } = (await c.req.json()) as Partial<Expense>;
    if (!isStr(memberId) || typeof amount !== 'number' || !isStr(date) || !isStr(deviceInfo)) {
      return bad(c, 'Member ID, amount, date, and device info are required');
    }
    const expense: Expense = { id: crypto.randomUUID(), memberId, amount, date, note, deviceInfo };
    await ExpenseEntity.create(c.env, expense);
    // Audit Log
    const member = await new MemberEntity(c.env, memberId).getState();
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      event: 'expense_created',
      userId: memberId,
      userName: member.name,
      timestamp: new Date().toISOString(),
      deviceInfo,
      metadata: { expenseId: expense.id, amount: expense.amount },
    };
    await AuditLogEntity.create(c.env, auditLog);
    return ok(c, expense);
  });
  app.put('/api/expenses/:id', async (c) => {
    const id = c.req.param('id');
    const { amount, date, note } = (await c.req.json()) as Partial<Expense>;
    const expenseEntity = new ExpenseEntity(c.env, id);
    if (!(await expenseEntity.exists())) return notFound(c, 'Expense not found');
    const updatePayload: Partial<Expense> = {};
    if (typeof amount === 'number') updatePayload.amount = amount;
    if (isStr(date)) updatePayload.date = date;
    if (note !== undefined) updatePayload.note = note;
    await expenseEntity.patch(updatePayload);
    return ok(c, await expenseEntity.getState());
  });
  app.delete('/api/expenses/:id', async (c) => {
    const id = c.req.param('id');
    const deleted = await ExpenseEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });
  // AUDIT LOGS
  app.post('/api/audit-logs', async (c) => {
    const body = (await c.req.json()) as Partial<AuditLog>;
    if (!body.event || !body.userId || !body.userName || !body.deviceInfo) {
      return bad(c, 'Missing required fields for audit log');
    }
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...body,
    } as AuditLog;
    await AuditLogEntity.create(c.env, auditLog);
    return ok(c, auditLog);
  });
}
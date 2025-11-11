import { Hono } from "hono";
import type { Env } from './core-utils';
import { MessSettingsEntity, MemberEntity, ExpenseEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { Member, MemberType, Expense } from "@shared/types";
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
    const { name, type } = (await c.req.json()) as { name?: string; type?: MemberType };
    if (!isStr(name) || !['standard', 'reduced'].includes(type!)) return bad(c, 'Name and type are required');
    const memberEntity = new MemberEntity(c.env, id);
    if (!(await memberEntity.exists())) return notFound(c, 'Member not found');
    const settings = await new MessSettingsEntity(c.env).getState();
    const contribution = type === 'standard' ? settings.standardContribution : settings.reducedContribution;
    await memberEntity.patch({ name, type, contribution });
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
    return ok(c, expense);
  });
  app.delete('/api/expenses/:id', async (c) => {
    const id = c.req.param('id');
    const deleted = await ExpenseEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });
}
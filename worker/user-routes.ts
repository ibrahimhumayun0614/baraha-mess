import { Hono } from "hono";
import type { Env } from './core-utils';
import { MessSettingsEntity, MemberEntity, ExpenseEntity, AuditLogEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { Member, MemberType, Expense, AuditLog } from "@shared/types";
import { hashPassword } from "./auth-utils";
// Updated super admin password to 'Muhammed97@#'
const SUPER_ADMIN_PASSWORD_HASH = 'f2a398851346259a7c538813700754194545e12b7b51e13e51d3b141';
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // AUTH
  app.post('/api/auth/login', async (c) => {
    const { role, password, memberId } = await c.req.json<{ role: 'super_admin' | 'admin', password?: string, memberId?: string }>();
    if (!password) return bad(c, 'Password is required');
    const passwordHash = await hashPassword(password);
    if (role === 'super_admin') {
      if (passwordHash === SUPER_ADMIN_PASSWORD_HASH) {
        return ok(c, { role: 'admin', member: null });
      }
      return bad(c, 'Invalid credentials');
    }
    if (role === 'admin' && memberId) {
      const memberEntity = new MemberEntity(c.env, memberId);
      if (!(await memberEntity.exists())) return notFound(c, 'Member not found');
      const member = await memberEntity.getState();
      if (member.role !== 'admin') return bad(c, 'Member is not an admin');
      if (member.password === passwordHash) {
        const { password, ...memberWithoutPassword } = member;
        return ok(c, { role: 'admin', member: memberWithoutPassword });
      }
      return bad(c, 'Invalid credentials');
    }
    return bad(c, 'Invalid login request');
  });
  app.post('/api/auth/change-password', async (c) => {
    const { memberId, oldPassword, newPassword } = await c.req.json<{ memberId: string, oldPassword?: string, newPassword?: string }>();
    if (!memberId || !oldPassword || !newPassword) {
      return bad(c, 'Member ID, old password, and new password are required');
    }
    const memberEntity = new MemberEntity(c.env, memberId);
    if (!(await memberEntity.exists())) return notFound(c, 'Member not found');
    const member = await memberEntity.getState();
    if (member.role !== 'admin') return bad(c, 'Only admins can change their password.');
    const oldPasswordHash = await hashPassword(oldPassword);
    if (member.password !== oldPasswordHash) {
      return bad(c, 'Incorrect old password');
    }
    const newPasswordHash = await hashPassword(newPassword);
    await memberEntity.patch({ password: newPasswordHash });
    return ok(c, { success: true });
  });
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
    // Strip passwords before sending to client
    const membersWithoutPasswords = members.items.map(m => {
      const { password, ...rest } = m;
      return rest;
    });
    return ok(c, { settings: state, members: membersWithoutPasswords, expenses: expenses.items });
  });
  // MEMBERS
  app.get('/api/members', async (c) => {
    let page = await MemberEntity.list(c.env);
    if (page.items.length === 0) {
      const settings = await new MessSettingsEntity(c.env).getState();
      const mockMembersData: { name: string; type: MemberType, role: 'admin' | 'member' }[] = [
        { name: 'Alice', type: 'standard', role: 'admin' },
        { name: 'Bob', type: 'standard', role: 'member' },
        { name: 'Charlie', type: 'reduced', role: 'member' },
      ];
      const newMembers: Member[] = mockMembersData.map((m) => ({
        id: crypto.randomUUID(),
        name: m.name,
        type: m.type,
        role: m.role,
        contribution: m.type === 'standard' ? settings.standardContribution : settings.reducedContribution,
        daysEaten: settings.totalDays,
      }));
      // Set a default password for the mock admin
      const alice = newMembers.find(m => m.name === 'Alice');
      if (alice) {
        alice.password = await hashPassword('password');
      }
      await Promise.all(newMembers.map((m) => MemberEntity.create(c.env, m)));
      page = await MemberEntity.list(c.env); // Re-fetch to get the created members
    }
    // Strip passwords before sending to client
    const membersWithoutPasswords = page.items.map(m => {
      const { password, ...rest } = m;
      return rest;
    });
    return ok(c, membersWithoutPasswords);
  });
  app.post('/api/members', async (c) => {
    const { name, type } = (await c.req.json()) as { name?: string; type?: MemberType };
    if (!isStr(name) || !['standard', 'reduced'].includes(type!)) return bad(c, 'Name and type are required');
    const settings = await new MessSettingsEntity(c.env).getState();
    const contribution = type === 'standard' ? settings.standardContribution : settings.reducedContribution;
    const member: Member = { id: crypto.randomUUID(), name, type: type!, contribution, role: 'member', daysEaten: settings.totalDays };
    await MemberEntity.create(c.env, member);
    await AuditLogEntity.create(c.env, {
      id: crypto.randomUUID(),
      event: 'member_created',
      userId: 'admin',
      userName: 'Admin',
      timestamp: new Date().toISOString(),
      deviceInfo: c.req.header('User-Agent') || 'Unknown',
      metadata: { memberId: member.id, name: member.name },
    });
    return ok(c, member);
  });
  app.put('/api/members/:id', async (c) => {
    const id = c.req.param('id');
    const { name, type, contribution, daysEaten } = (await c.req.json()) as Partial<Member>;
    if (!isStr(name) && !isStr(type) && typeof contribution !== 'number' && typeof daysEaten !== 'number') {
      return bad(c, 'At least one field is required');
    }
    const memberEntity = new MemberEntity(c.env, id);
    if (!(await memberEntity.exists())) return notFound(c, 'Member not found');
    const oldMember = await memberEntity.getState();
    const updatePayload: Partial<Member> = {};
    if (name) updatePayload.name = name;
    if (type) updatePayload.type = type;
    if (typeof contribution === 'number') {
      updatePayload.contribution = contribution;
    } else if (type && type !== oldMember.type) {
      const settings = await new MessSettingsEntity(c.env).getState();
      updatePayload.contribution = type === 'standard' ? settings.standardContribution : settings.reducedContribution;
    }
    if (typeof daysEaten === 'number') updatePayload.daysEaten = daysEaten;
    await memberEntity.patch(updatePayload);
    const newMember = await memberEntity.getState();
    await AuditLogEntity.create(c.env, {
      id: crypto.randomUUID(),
      event: 'member_updated',
      userId: 'admin',
      userName: 'Admin',
      timestamp: new Date().toISOString(),
      deviceInfo: c.req.header('User-Agent') || 'Unknown',
      metadata: { memberId: newMember.id, changes: updatePayload },
    });
    const { password, ...memberWithoutPassword } = newMember;
    return ok(c, memberWithoutPassword);
  });
  app.put('/api/members/:id/role', async (c) => {
    const id = c.req.param('id');
    const { role, password } = (await c.req.json()) as { role: 'admin' | 'member', password?: string };
    if (!['admin', 'member'].includes(role)) {
      return bad(c, 'Invalid role specified');
    }
    const memberEntity = new MemberEntity(c.env, id);
    if (!(await memberEntity.exists())) return notFound(c, 'Member not found');
    const updatePayload: Partial<Member> = { role };
    if (role === 'admin') {
      if (!password) return bad(c, 'Password is required to promote to admin');
      updatePayload.password = await hashPassword(password);
    } else {
      // When demoting, remove the password
      updatePayload.password = undefined;
    }
    await memberEntity.patch(updatePayload);
    const updatedMember = await memberEntity.getState();
    const { password: _, ...memberWithoutPassword } = updatedMember;
    return ok(c, memberWithoutPassword);
  });
  app.delete('/api/members/:id', async (c) => {
    const id = c.req.param('id');
    const memberEntity = new MemberEntity(c.env, id);
    if (!(await memberEntity.exists())) return notFound(c, 'Member not found');
    const member = await memberEntity.getState();
    const deleted = await MemberEntity.delete(c.env, id);
    if (deleted) {
      await AuditLogEntity.create(c.env, {
        id: crypto.randomUUID(),
        event: 'member_deleted',
        userId: 'admin',
        userName: 'Admin',
        timestamp: new Date().toISOString(),
        deviceInfo: c.req.header('User-Agent') || 'Unknown',
        metadata: { memberId: member.id, name: member.name },
      });
    }
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
    const member = await new MemberEntity(c.env, memberId).getState();
    await AuditLogEntity.create(c.env, {
      id: crypto.randomUUID(),
      event: 'expense_created',
      userId: memberId,
      userName: member.name,
      timestamp: new Date().toISOString(),
      deviceInfo,
      metadata: { expenseId: expense.id, amount: expense.amount },
    });
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
    const updatedExpense = await expenseEntity.getState();
    const member = await new MemberEntity(c.env, updatedExpense.memberId).getState();
    await AuditLogEntity.create(c.env, {
      id: crypto.randomUUID(),
      event: 'expense_updated',
      userId: 'admin',
      userName: 'Admin',
      timestamp: new Date().toISOString(),
      deviceInfo: c.req.header('User-Agent') || 'Unknown',
      metadata: { expenseId: updatedExpense.id, memberName: member.name, changes: updatePayload },
    });
    return ok(c, updatedExpense);
  });
  app.delete('/api/expenses/:id', async (c) => {
    const id = c.req.param('id');
    const expenseEntity = new ExpenseEntity(c.env, id);
    if (!(await expenseEntity.exists())) return notFound(c, 'Expense not found');
    const expense = await expenseEntity.getState();
    const deleted = await ExpenseEntity.delete(c.env, id);
    if (deleted) {
      const member = await new MemberEntity(c.env, expense.memberId).getState();
      await AuditLogEntity.create(c.env, {
        id: crypto.randomUUID(),
        event: 'expense_deleted',
        userId: 'admin',
        userName: 'Admin',
        timestamp: new Date().toISOString(),
        deviceInfo: c.req.header('User-Agent') || 'Unknown',
        metadata: { expenseId: expense.id, amount: expense.amount, memberName: member.name },
      });
    }
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
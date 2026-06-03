// src/models/pgModels.js
// Thin PG wrappers that mimic Mongoose-like API used by controllers
import { query, getClient } from '../config/db.js';

// ── Utility ────────────────────────────────────────────────────────────────
function toUUID(v) {
    if (!v) return null;
    const s = String(v);
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRe.test(s) ? s : null;
}

function buildWhere(filter = {}) {
    const keys = Object.keys(filter);
    if (!keys.length) return { text: '', values: [] };
    const parts = [];
    const values = [];
    let i = 1;
    for (const k of keys) {
        const v = filter[k];
        if (v === null || v === undefined) {
            parts.push(`${k} IS NULL`);
        } else if (Array.isArray(v)) {
            parts.push(`${k} = ANY($${i++})`);
            values.push(v);
        } else {
            parts.push(`${k} = $${i++}`);
            values.push(v);
        }
    }
    return { text: 'WHERE ' + parts.join(' AND '), values };
}

function makeModel(table, pk = 'id') {
    return {
        table,
        async findOne(filter) {
            const { text, values } = buildWhere(filter);
            const r = await query(`SELECT * FROM ${table} ${text} LIMIT 1`, values);
            return r.rows[0] || null;
        },
        async find(filter = {}, opts = {}) {
            const { text, values } = buildWhere(filter);
            let sql = `SELECT * FROM ${table} ${text}`;
            if (opts.orderBy) sql += ` ORDER BY ${opts.orderBy}`;
            if (opts.limit)   sql += ` LIMIT ${opts.limit}`;
            if (opts.offset)  sql += ` OFFSET ${opts.offset}`;
            const r = await query(sql, values);
            return r.rows;
        },
        async findById(id) {
            const r = await query(`SELECT * FROM ${table} WHERE ${pk} = $1`, [id]);
            return r.rows[0] || null;
        },
        async count(filter = {}) {
            const { text, values } = buildWhere(filter);
            const r = await query(`SELECT COUNT(*) as c FROM ${table} ${text}`, values);
            return parseInt(r.rows[0].c, 10);
        },
        async create(data) {
            const keys = Object.keys(data).filter(k => data[k] !== undefined);
            const vals = keys.map(k => data[k]);
            const cols = keys.join(', ');
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const r = await query(
                `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`,
                vals
            );
            return r.rows[0];
        },
        async updateById(id, data) {
            const keys = Object.keys(data).filter(k => k !== pk && data[k] !== undefined);
            if (!keys.length) return this.findById(id);
            const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
            const vals = keys.map(k => data[k]);
            const r = await query(
                `UPDATE ${table} SET ${sets} WHERE ${pk} = $1 RETURNING *`,
                [id, ...vals]
            );
            return r.rows[0] || null;
        },
        async update(filter, data) {
            const { text: wt, values: wv } = buildWhere(filter);
            const keys = Object.keys(data).filter(k => k !== pk && data[k] !== undefined);
            if (!keys.length) return [];
            const offset = wv.length;
            const sets = keys.map((k, i) => `${k} = $${offset + i + 1}`).join(', ');
            const vals = [...wv, ...keys.map(k => data[k])];
            const r = await query(
                `UPDATE ${table} SET ${sets} ${wt} RETURNING *`,
                vals
            );
            return r.rows;
        },
        async deleteById(id) {
            const r = await query(
                `DELETE FROM ${table} WHERE ${pk} = $1 RETURNING *`, [id]
            );
            return r.rows[0] || null;
        },
        async delete(filter) {
            const { text, values } = buildWhere(filter);
            const r = await query(`DELETE FROM ${table} ${text} RETURNING *`, values);
            return r.rows;
        },
        async raw(sql, values) {
            return query(sql, values);
        }
    };
}

// ── Models ─────────────────────────────────────────────────────────────────
export const Tenant       = makeModel('tenants');
export const User         = makeModel('users');
export const Career       = makeModel('careers');
export const Course       = makeModel('courses');
export const Subject      = makeModel('subjects');
export const Student      = makeModel('students');
export const Guardian     = makeModel('guardians');
export const Enrollment   = makeModel('enrollments');
export const Evaluation   = makeModel('evaluations');
export const Grade        = makeModel('grades');
export const Attendance   = makeModel('attendances');
export const Schedule     = makeModel('schedules');
export const ClassLog     = makeModel('class_logs');
export const ClassBookLog = makeModel('classbook_logs');
export const Empresa      = makeModel('empresas');
export const Alternancia  = makeModel('alternancias');
export const Atraso       = makeModel('atrasos');
export const Citacion     = makeModel('citaciones');
export const Anotacion    = makeModel('anotaciones');
export const MedicalLicense = makeModel('medical_licenses');
export const Event        = makeModel('events');
export const EventRequest = makeModel('event_requests');
export const Message      = makeModel('messages');
export const Notification = makeModel('user_notifications');
export const AuditLog     = makeModel('audit_logs');
export const Tariff       = makeModel('tariffs');
export const AdminDay     = makeModel('admin_days');
export const Payment      = makeModel('payments');
export const PayrollPayment = makeModel('payroll_payments');

export { toUUID, buildWhere, query, getClient };

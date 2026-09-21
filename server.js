require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

// Render servers run on UTC. Without an explicit timezone, "today" would be
// wrong for the first 8 hours of every day in Malaysia.
const TIMEZONE = 'Asia/Kuala_Lumpur';

// Helper: Get authenticated Supabase client

function getSupabaseFromRequest(req) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const accessToken = authHeader.replace('Bearer ', '');

    return createClient(supabaseUrl, supabaseKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
}

// ============================================================
// DATE HELPERS  (all dates are 'YYYY-MM-DD' strings)
// ============================================================

function getTodayKL() {
    // 'en-CA' formats as YYYY-MM-DD
    return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

function toDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

function fmt(date) {
    return date.toISOString().slice(0, 10);
}

function addDays(str, n) {
    const d = toDate(str);
    d.setUTCDate(d.getUTCDate() + n);
    return fmt(d);
}

function startOfWeek(str) {
    // Week starts on Monday
    const dow = (toDate(str).getUTCDay() + 6) % 7;
    return addDays(str, -dow);
}

function monthRange(year, month) {
    // month is 1-12. endExclusive is the first day of the NEXT month.
    return {
        start: fmt(new Date(Date.UTC(year, month - 1, 1))),
        endExclusive: fmt(new Date(Date.UTC(year, month, 1))),
    };
}

function longDate(str) {
    return toDate(str).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

const MONTH_LOOKUP = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sept: 9, sep: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12,
};

const MONTH_REGEX =
    /\b(january|february|march|april|may|june|july|august|september|sept|sep|october|november|december|jan|feb|mar|apr|jun|jul|aug|oct|nov|dec)\b(?:\s+(20\d{2}))?/g;

/**
 * Turns words like "today", "yesterday", "this month", "july",
 * "last 7 days", "2026-07-15" into a date range.
 *
 * Returns { label, start, endExclusive }  (start/endExclusive can be null)
 * If several periods are mentioned ("this month vs last month"),
 * the range spans all of them (the by-month breakdown separates them).
 * If nothing is recognised, it returns all-time (start/endExclusive = null).
 */
function resolveDateRange(question, today) {
    const q = question.toLowerCase();
    const [ty, tm] = today.split('-').map(Number);
    const found = []; // { label, start, endExclusive }

    const push = (label, start, endExclusive) =>
        found.push({ label, start, endExclusive });

    // --- Days ---
    if (/\b(today|hari ini)\b/.test(q)) {
        push('today', today, addDays(today, 1));
    }

    if (/\b(yesterday|semalam)\b/.test(q)) {
        const y = addDays(today, -1);
        push('yesterday', y, today);
    }

    const lastNDays = q.match(/\b(?:last|past)\s+(\d{1,3})\s+days?\b/);
    if (lastNDays) {
        const n = Number(lastNDays[1]);
        push(`last ${n} days`, addDays(today, -(n - 1)), addDays(today, 1));
    }

    for (const iso of q.match(/\b20\d{2}-\d{2}-\d{2}\b/g) || []) {
        push(iso, iso, addDays(iso, 1));
    }

    // --- Weeks ---
    if (/\b(this week|minggu ini)\b/.test(q)) {
        const s = startOfWeek(today);
        push('this week', s, addDays(s, 7));
    }

    if (/\b(last week|previous week|minggu lepas)\b/.test(q)) {
        const s = addDays(startOfWeek(today), -7);
        push('last week', s, addDays(s, 7));
    }

    // --- Months ---
    if (/\b(this month|bulan ini)\b/.test(q)) {
        const r = monthRange(ty, tm);
        push('this month', r.start, r.endExclusive);
    }

    if (/\b(last month|previous month|bulan lepas)\b/.test(q)) {
        const r = tm === 1 ? monthRange(ty - 1, 12) : monthRange(ty, tm - 1);
        push('last month', r.start, r.endExclusive);
    }

    // Named months: "july", "sales in aug", "july 2025"
    const explicitLastYear = /\blast year\b/.test(q);
    let sawNamedMonth = false;

    for (const m of q.matchAll(MONTH_REGEX)) {
        const word = m[1];
        const yearWord = m[2] ? Number(m[2]) : null;

        // "may" is also a normal English word, so only accept it when
        // it is clearly a month ("in may", "for may", "may 2026")
        if (word === 'may' && !yearWord) {
            const before = q.slice(0, m.index).trim().split(/\s+/).pop();
            if (!['in', 'of', 'for', 'during', 'since', 'on', 'from'].includes(before)) {
                continue;
            }
        }

        const month = MONTH_LOOKUP[word];
        let year;

        if (yearWord) {
            year = yearWord;
        } else if (explicitLastYear) {
            year = ty - 1;
        } else {
            // No year given: use the most recent such month that is not in the future
            year = month <= tm ? ty : ty - 1;
        }

        const r = monthRange(year, month);
        push(`${word} ${year}`, r.start, r.endExclusive);
        sawNamedMonth = true;
    }

    // --- Years (ignored when a month was named, e.g. "july this year") ---
    if (!sawNamedMonth) {
        if (/\b(this year|tahun ini)\b/.test(q)) {
            push('this year', `${ty}-01-01`, `${ty + 1}-01-01`);
        }

        if (explicitLastYear) {
            push('last year', `${ty - 1}-01-01`, `${ty}-01-01`);
        }
    }

    // --- Nothing recognised -> all time ---
    if (found.length === 0) {
        return { label: 'all available data', start: null, endExclusive: null };
    }

    const start = found.reduce((min, r) => (r.start < min ? r.start : min), found[0].start);
    const endExclusive = found.reduce(
        (max, r) => (r.endExclusive > max ? r.endExclusive : max),
        found[0].endExclusive
    );

    return {
        label: found.map((r) => r.label).join(', '),
        start,
        endExclusive,
    };
}

// ============================================================
// DATA LOADING  (backend decides WHAT data the AI gets)
// ============================================================

const LIVE_COLUMNS = `
    Session_id,
    employee_id,
    session_date,
    day_of_week,
    duration_hours,
    items_sold,
    gmv_amount,
    views,
    start_time,
    end_time
`;

// Supabase returns at most 1000 rows per request by default.
// Since the old query sorted oldest-first, the NEWEST sessions (e.g. July)
// were silently cut off once the table passed 1000 rows.
// This helper keeps fetching pages until everything is loaded.
async function fetchAll(buildQuery) {
    const pageSize = 1000;
    const all = [];
    let from = 0;

    while (true) {
        const { data, error } = await buildQuery().range(from, from + pageSize - 1);

        if (error) throw error;

        all.push(...(data || []));

        if (!data || data.length < pageSize) break;

        from += pageSize;
    }

    return all;
}

// Live = source of truth for SALES. Includes sessions by every staff
// member, including the owner. Employees only get their own rows.
function loadLiveRows(supabase, { employeeId, range }) {
    return fetchAll(() => {
        let query = supabase
            .from('Live')
            .select(LIVE_COLUMNS)
            .order('session_date', { ascending: true })
            .order('Session_id', { ascending: true });

        if (employeeId) query = query.eq('employee_id', employeeId);
        if (range.start) query = query.gte('session_date', range.start);
        if (range.endExclusive) query = query.lt('session_date', range.endExclusive);

        return query;
    });
}

// Payout = salary records only. Loaded ONLY when the question is about pay.
async function loadPayouts(supabase, { employeeId, isAdmin, range }) {
    const columns = isAdmin
        ? `payout_id, employee_id, employee_name, period_start_date, period_end_date,
           total_hours_worked, total_items_sold, total_gmv, base_payment,
           bonus_amount, final_payout, payout_date`
        : `payout_id, period_start_date, period_end_date, total_hours_worked,
           total_items_sold, total_gmv, base_payment, bonus_amount,
           final_payout, payout_date`;

    let query = supabase
        .from('Payout')
        .select(columns)
        .order('payout_date', { ascending: false })
        .limit(36);

    if (employeeId) query = query.eq('employee_id', employeeId);

    // Payout periods that overlap the requested range
    if (range.start) query = query.gte('period_end_date', range.start);
    if (range.endExclusive) query = query.lt('period_start_date', range.endExclusive);

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
}

// ============================================================
// AGGREGATION  (the AI gets finished numbers, not raw rows to add up)
// ============================================================

const round2 = (n) => Math.round(n * 100) / 100;

const dateKey = (row) => String(row.session_date).slice(0, 10);

function summarize(rows) {
    const s = {
        sessions: rows.length,
        total_gmv: 0,
        total_items_sold: 0,
        total_views: 0,
        total_hours: 0,
    };

    for (const r of rows) {
        s.total_gmv += Number(r.gmv_amount || 0);
        s.total_items_sold += Number(r.items_sold || 0);
        s.total_views += Number(r.views || 0);
        s.total_hours += Number(r.duration_hours || 0);
    }

    s.total_gmv = round2(s.total_gmv);
    s.total_hours = round2(s.total_hours);

    return s;
}

function groupRows(rows, keyFn) {
    const groups = new Map();

    for (const row of rows) {
        const key = keyFn(row);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
    }

    return groups;
}

function summarizeByMonth(rows) {
    return [...groupRows(rows, (r) => dateKey(r).slice(0, 7)).entries()]
        .map(([month, g]) => ({ month, ...summarize(g) }))
        .sort((a, b) => a.month.localeCompare(b.month));
}

function summarizeByDay(rows) {
    return [...groupRows(rows, dateKey).entries()]
        .map(([date, g]) => ({
            date,
            day_of_week: toDate(date).toLocaleDateString('en-GB', {
                weekday: 'long',
                timeZone: 'UTC',
            }),
            ...summarize(g),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

function summarizeByEmployee(rows, employees) {
    const nameById = new Map(employees.map((e) => [e.userid, e]));

    return [...groupRows(rows, (r) => r.employee_id).entries()]
        .map(([employeeId, g]) => {
            const emp = nameById.get(employeeId);

            return {
                employee_id: employeeId,
                username: emp ? emp.username : 'Unknown',
                role: emp ? emp.role : 'Unknown',
                ...summarize(g),
            };
        })
        .sort((a, b) => b.total_gmv - a.total_gmv);
}

// ============================================================
// Test Supabase
// ============================================================

app.get('/api/test-supabase', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Missing authentication token.',
            });
        }

        const accessToken = authHeader.replace('Bearer ', '');

        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
        });

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser(accessToken);

        if (userError || !user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired Supabase session.',
            });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('userid, username, email, role')
            .eq('email', user.email)
            .single();

        if (profileError) {
            return res.status(500).json({
                success: false,
                error: profileError.message,
            });
        }

        res.json({
            success: true,
            user: {
                email: user.email,
            },
            profile: profile,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// ============================================================
// AI CHAT
// ============================================================

const SYSTEM_INSTRUCTION = `
You are the AI assistant for the CAPT Empire business management system.
Answer ONLY from the DATA provided. Never invent, guess or estimate numbers.

WHAT EACH PART OF THE DATA MEANS
- sales_summary, sales_by_month, sales_by_day, sales_by_employee and
  live_sessions come from the Live table. This is the ONLY source for sales.
  "Sales", "sales amount", "revenue" and "GMV" all mean the sum of gmv_amount
  from live sessions. Live sessions include every staff member AND the owner.
- "views" means live-stream views. Money is in Malaysian Ringgit (RM).
- payouts are salary records. NEVER use payouts to answer sales questions.
  A month's payout may not be recorded yet. If payouts is empty or missing
  for the period, say the payout is not recorded yet - do not calculate it.
- period is the date range the data was filtered to. today, yesterday,
  this_week, this_month, last_month in "calendar" are the correct dates for
  words like "today" or "this month". Always use them; never guess the date.
- If sessions is 0 for the period, say no live sessions were recorded in that
  period. Do not say the data is unavailable.
- If the user asks about a period that is not covered by "period", say which
  period you have data for.

ACCESS RULES
- Employees can ONLY see their own live and payout information.
- Admin and Owner can see business-wide information.
- Never reveal other employees' private information to an employee.

STYLE
Keep answers short, clear and easy to understand. Answer the question directly.
`;

app.post('/api/chat', async (req, res) => {
    try {
        // 1. Authentication

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'You must be logged in.',
            });
        }

        const accessToken = authHeader.replace('Bearer ', '');

        // 2. Authenticated Supabase client

        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
        });

        // 3. Verify logged-in user

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser(accessToken);

        if (userError || !user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session.',
            });
        }

        // 4. Get profile

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('userid, username, email, role, hourly_rate')
            .eq('email', user.email)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({
                success: false,
                error: 'User profile not found.',
            });
        }

        const isEmployee = profile.role === 'employee';
        const isAdmin = profile.role === 'admin' || profile.role === 'owner';

        if (!isEmployee && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Your role cannot use the assistant.',
            });
        }

        // 5. Get question

        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Message cannot be empty.',
            });
        }

        const question = message.trim().toLowerCase();

        // 6. Work out WHAT the question needs (backend decides, not the AI)

        const today = getTodayKL();
        const range = resolveDateRange(question, today);

        const wantsPayout =
            /\b(payout|payouts|salary|salaries|wage|wages|pay|paid|payslip|bonus|commission|gaji)\b/.test(
                question
            );

        const wantsStock =
            /\b(stock|stocks|inventory|product|products|category|categories|restock)\b/.test(
                question
            );

        console.log('--------------------------------');
        console.log('User:', profile.username, '| Role:', profile.role);
        console.log('Question:', message);
        console.log('Today (KL):', today);
        console.log('Range:', range.label, range.start, '->', range.endExclusive);
        console.log('wantsPayout:', wantsPayout, '| wantsStock:', wantsStock);

        // 7. Load only the data needed

        // Live sales rows: employees = own rows, admin/owner = everyone
        const liveRows = await loadLiveRows(supabase, {
            employeeId: isEmployee ? profile.userid : null,
            range,
        });

        // Employee list (admin/owner): used to turn employee_id into names
        let employees = [];

        if (isAdmin) {
            const { data, error } = await supabase
                .from('profiles')
                .select('userid, username, role, hourly_rate');

            if (error) throw error;

            employees = data || [];
        }

        // Payouts: only when the question is about pay
        let payouts = null;

        if (wantsPayout) {
            payouts = await loadPayouts(supabase, {
                employeeId: isEmployee ? profile.userid : null,
                isAdmin,
                range,
            });
        }

        // Product stock: admin/owner only, only when asked
        let products = null;

        if (isAdmin && wantsStock) {
            const { data, error } = await supabase
                .from('Product')
                .select('Product_id, Product_name, category, Stock')
                .order('Stock', { ascending: true });

            if (error) throw error;

            products = data || [];
        }

        console.log('Live rows loaded:', liveRows.length);
        if (payouts) console.log('Payout rows loaded:', payouts.length);
        if (products) console.log('Product rows loaded:', products.length);

        // 8. Build the data for Gemini (pre-calculated numbers)

        const spanDays = range.start
            ? (toDate(range.endExclusive) - toDate(range.start)) / 86400000
            : Infinity;

        const [ty, tm] = today.split('-').map(Number);
        const thisMonth = monthRange(ty, tm);
        const lastMonth = tm === 1 ? monthRange(ty - 1, 12) : monthRange(ty, tm - 1);
        const weekStart = startOfWeek(today);

        const databaseData = {
            calendar: {
                timezone: TIMEZONE,
                today: `${longDate(today)} (${today})`,
                yesterday: `${longDate(addDays(today, -1))} (${addDays(today, -1)})`,
                this_week: `${weekStart} to ${addDays(weekStart, 6)} (Monday-Sunday)`,
                this_month: `${thisMonth.start} to ${addDays(thisMonth.endExclusive, -1)}`,
                last_month: `${lastMonth.start} to ${addDays(lastMonth.endExclusive, -1)}`,
            },

            logged_in_user: {
                username: profile.username,
                userid: profile.userid,
                role: profile.role,
            },

            period: {
                label: range.label,
                start: range.start,
                end: range.endExclusive ? addDays(range.endExclusive, -1) : null,
            },

            sales_summary: summarize(liveRows),
            sales_by_month: summarizeByMonth(liveRows),
        };

        if (spanDays <= 62) {
            databaseData.sales_by_day = summarizeByDay(liveRows);
        }

        if (isAdmin) {
            databaseData.sales_by_employee = summarizeByEmployee(liveRows, employees);
        }

        // Raw sessions only for small result sets (e.g. "today")
        if (liveRows.length <= 50) {
            databaseData.live_sessions = liveRows;
        }

        if (payouts) {
            databaseData.payouts = payouts;
            databaseData.payout_records_found = payouts.length;

            if (isAdmin) {
                databaseData.employee_hourly_rates = employees.map((e) => ({
                    username: e.username,
                    role: e.role,
                    hourly_rate: e.hourly_rate,
                }));
            }
        }

        if (products) {
            databaseData.products = products;
        }

        // 9. Ask Gemini

        const contents = `
DATA:
${JSON.stringify(databaseData, null, 2)}

USER QUESTION:
${message}
`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',

            contents,

            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.2,
            },
        });

        // 10. Send response

        res.json({
            success: true,

            answer: response.text,
        });
    } catch (error) {
        console.error('Chat error:', error);

        res.status(500).json({
            success: false,

            error: error.message,
        });
    }
});

// Start server (only when run directly, so the helpers can be unit-tested)

if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = {
    app,
    resolveDateRange,
    summarize,
    summarizeByMonth,
    summarizeByDay,
    summarizeByEmployee,
    fetchAll,
};
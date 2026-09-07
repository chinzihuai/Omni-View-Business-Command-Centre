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

// Test Supabase

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

// AI CHAT

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
            .select(
                `
                userid,
                username,
                email,
                role,
                hourly_rate
            `
            )
            .eq('email', user.email)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({
                success: false,
                error: 'User profile not found.',
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

        console.log('--------------------------------');
        console.log('User:', profile.username);
        console.log('Role:', profile.role);
        console.log('Question:', message);

        // 6. Prepare variables

        let liveData = [];
        let payoutData = [];
        let productData = [];
        let profilesData = [];

        // 7. EMPLOYEE

        if (profile.role === 'employee') {
            // Load own Live data

            const { data, error } = await supabase
                .from('Live')
                .select(
                    `
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
                `
                )
                .eq('employee_id', profile.userid)
                .order('session_date', {
                    ascending: true,
                });

            if (error) {
                console.error('Employee Live error:', error);

                return res.status(500).json({
                    success: false,
                    error: 'Unable to load Live data.',
                });
            }

            liveData = data || [];

            // Load own Payout data

            const { data: payouts, error: payoutError } = await supabase
                .from('Payout')
                .select(
                    `
                    payout_id,
                    period_start_date,
                    period_end_date,
                    total_hours_worked,
                    total_items_sold,
                    total_gmv,
                    base_payment,
                    bonus_amount,
                    final_payout,
                    payout_date
                `
                )
                .eq('employee_id', profile.userid)
                .order('payout_date', {
                    ascending: false,
                });

            if (payoutError) {
                console.error('Employee Payout error:', payoutError);

                return res.status(500).json({
                    success: false,
                    error: 'Unable to load payout data.',
                });
            }

            payoutData = payouts || [];
        }

        // 8. ADMIN / OWNER
        else if (profile.role === 'admin' || profile.role === 'owner') {
            // Load ALL Live data

            const { data, error } = await supabase
                .from('Live')
                .select(
                    `
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
                `
                )
                .order('session_date', {
                    ascending: true,
                });

            if (error) {
                console.error('Admin Live error:', error);

                return res.status(500).json({
                    success: false,
                    error: 'Unable to load Live data.',
                });
            }

            liveData = data || [];

            // Load ALL Payout data

            const { data: payouts, error: payoutError } = await supabase
                .from('Payout')
                .select(
                    `
                    payout_id,
                    employee_id,
                    employee_name,
                    period_start_date,
                    period_end_date,
                    total_hours_worked,
                    total_items_sold,
                    total_gmv,
                    base_payment,
                    bonus_amount,
                    final_payout,
                    payout_date
                `
                )
                .order('payout_date', {
                    ascending: false,
                });

            if (payoutError) {
                console.error('Admin Payout error:', payoutError);

                return res.status(500).json({
                    success: false,
                    error: 'Unable to load payout data.',
                });
            }

            payoutData = payouts || [];

            // Load ALL employees

            const { data: employees, error: employeeError } =
                await supabase.from('profiles').select(`
                    userid,
                    username,
                    role,
                    hourly_rate
                `);

            if (employeeError) {
                console.error('Employee profile error:', employeeError);

                return res.status(500).json({
                    success: false,
                    error: 'Unable to load employee data.',
                });
            }

            profilesData = employees || [];

            // Load Product stock

            const { data: products, error: productError } = await supabase
                .from('Product')
                .select(
                    `
                    Product_id,
                    Product_name,
                    category,
                    Stock
                `
                )
                .order('Stock', {
                    ascending: true,
                });

            if (productError) {
                console.error('Product error:', productError);

                return res.status(500).json({
                    success: false,
                    error: 'Unable to load product data.',
                });
            }

            productData = products || [];
        }

        // 9. Calculate Live statistics

        const totalViews = liveData.reduce(
            (sum, row) => sum + Number(row.views || 0),
            0
        );

        const totalItemsSold = liveData.reduce(
            (sum, row) => sum + Number(row.items_sold || 0),
            0
        );

        const totalGMV = liveData.reduce(
            (sum, row) => sum + Number(row.gmv_amount || 0),
            0
        );

        const totalHours = liveData.reduce(
            (sum, row) => sum + Number(row.duration_hours || 0),
            0
        );

        // 10. Database data for Gemini

        const databaseData = {
            logged_in_user: {
                username: profile.username,
                userid: profile.userid,
                role: profile.role,
            },

            live_summary: {
                sessions: liveData.length,

                total_views: totalViews,

                total_items_sold: totalItemsSold,

                total_gmv: totalGMV,

                total_hours: totalHours,
            },

            live_data: liveData,

            payout_data: payoutData,

            // Only contains data for admin/owner
            employees: profilesData,

            products: productData,
        };

        // 11. Debug

        console.log('Live rows loaded:', liveData.length);

        console.log('Payout rows loaded:', payoutData.length);

        if (profile.role === 'admin' || profile.role === 'owner') {
            console.log('Employee rows loaded:', profilesData.length);

            console.log('Product rows loaded:', productData.length);
        }

        // 12. Gemini prompt

        const prompt = `
You are the AI assistant for the CAPT Empire
business management system.

The current logged-in user is:

${JSON.stringify(profile, null, 2)}


IMPORTANT SECURITY RULES:

1. Only answer using the database information provided.

2. Never invent numbers.

3. Never guess missing information.

4. Employees can ONLY access their own
   Live and Payout information.

5. Admin and Owner can access business-wide
   information.

6. Never reveal private employee information
   to an employee.

7. Money is in Malaysian Ringgit (RM).

8. "views" means live-stream views.

9. Keep answers short, clear and easy to understand.


DATABASE DATA:

${JSON.stringify(databaseData, null, 2)}


USER QUESTION:

${message}


Answer the user's question directly.
`;

        // 13. Gemini

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',

            contents: prompt,
        });

        // 14. Send response

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

// Start server

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

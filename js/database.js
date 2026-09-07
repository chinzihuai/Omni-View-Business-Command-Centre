const supabaseUrl = 'https://uvmsvoyuzcwncwkghzml.supabase.co';
const supabaseKey = 'sb_publishable_W3YQagWaZn0GLDpj8a8Gvg_WwhXG_Xt';

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const STAFF_ROLES = ['employee', 'owner']; // used for live/payout dropdowns — owner logs their own sessions too, not an org headcount category

async function fetchStaffProfiles() {
    return supabaseClient
        .from('profiles')
        .select('userid, username, role')
        .in('role', STAFF_ROLES);
}

let PayoutTable;

async function loadPayouts() {
    const{data:sessionData,error:sessionError}=await supabaseClient.auth.getSession();

    if(sessionError || !sessionData || !sessionData.session) {
        console.error("Error fetching session:", sessionError);
        alert("Error fetching session. Please check the console for details.");
        return;
    }

    const session = sessionData?.session;

    if(!session){
        console.error("No active session found.");
        return;
    }

    const user=session.user;
    
    if(!user || !user.email){
        console.error("User email not found in session.");
        return;
    }


    const {data:profile,error:profileError}=await supabaseClient
        .from("profiles")
        .select("userid")
        .eq("email",user.email)
        .single();

    if(profileError){
        console.error("Error fetching profile:", profileError);
        alert("Error fetching profile. Please check the console for details.");
        return;
    }

    const employee_id = profile.userid;

    const {data, error} = await supabaseClient
        .from('Payout')
        .select('*')
        .eq('employee_id', employee_id);

    if(error){
        console.error("Error fetching live sessions:", error);
        alert("Error fetching live sessions. Please check the console for details.");
        return;
    }


    if(!PayoutTable){
        PayoutTable = new DataTable('#PayoutTable', {
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50,100],
            paging: true,
            ordering: true,
            info: true
        });
    }

    PayoutTable.clear();

    data.forEach(payout => {
        PayoutTable.row.add([
            payout.payout_id,
            payout.employee_id,
            payout.employee_name,
            payout.period_start_date,
            payout.period_end_date,
            payout.total_hours_worked,
            payout.total_items_sold,
            payout.total_gmv,
            payout.base_payment ,
            payout.bonus_amount,
            payout.final_payout,
            payout.payout_date,  
        ]);
    });

    PayoutTable.draw();

}

document.addEventListener('DOMContentLoaded', function() {
    loadPayouts();
});
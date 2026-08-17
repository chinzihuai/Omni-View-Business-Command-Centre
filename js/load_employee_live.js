let LiveTable;

async function loadlives() {

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
    const today_date = new Date();

    const {data, error} = await supabaseClient
        .from('Live')
        .select('*')
        .eq('employee_id', employee_id);
    
    if(error){
        console.error("Error fetching live sessions:", error);
        alert("Error fetching live sessions. Please check the console for details.");
        return;
    }

    if(!LiveTable) {
        LiveTable = new DataTable('#LiveTable', {
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50,100],
            paging: true,
            ordering: true,
            info: true  
        });
    }

    LiveTable.clear();

    data.forEach(Live => {
        LiveTable.row.add([
            Live.Session_id,
            Live.employee_id,
            Live.session_date,
            Live.day_of_week,
            Live.start_time,
            Live.end_time,
            Live.duration_hours,
            Live.items_sold,
            Live.gmv_amount,
            Live.views,
        ]); 
    });

    LiveTable.draw();
}

document.addEventListener('DOMContentLoaded', function() {
    loadlives();
});
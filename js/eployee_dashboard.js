async function loaddaily() {
    const {data:sessionData,error:sessionError}=await supabaseClient.auth.getSession();

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

    if (profileError) {
        console.error("Profile error:", profileError);
        return;
    }

    if (!profile || profile.length === 0) {
        console.error("Employee profile not found.");
        return;
    }

    const today_date=new Date();
    const userid=profile.userid;

    const {data:today,error:todayError}=await supabaseClient
        .from('Live')
        .select('gmv_amount,views')
        .eq('employee_id', userid)
        .eq('session_date', today_date.toISOString().split('T')[0]);

    if(todayError){
        console.error("Error fetching today's live sessions:", todayError);
        return;
    }
    
    const total_gmv = today.reduce((sum, session) => sum + (session.gmv_amount || 0), 0);
    const total_views = today.reduce((sum, session) => sum + (session.views || 0), 0);

    if(total_gmv>0 && total_views>0){
        
        today_sales=document.getElementById('todaysales');
        today_live_views=document.getElementById('todayliveviews');

        today_sales.textContent = total_gmv;
        today_live_views.textContent = total_views;
    }
}

document.getElementById(DOMException,loaddaily());
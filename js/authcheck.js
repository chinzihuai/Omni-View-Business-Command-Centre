async function checkAuthentication() {
const {data:{session},error}=await supabaseClient.auth.getSession();

if(error || !session) {
    window.location.replace("login.html");
}

else{
    const{data:profile,error}=await supabaseClient.from("profiles").select("role").eq("email",session.user.email).single();

    if(error || !profile) {
        console.error("Profile not found");
        await supabaseClient.auth.signOut();
        window.location.replace("login.html");
    }

    else{
        console.log("Authenticated:", session.user.email);
        console.log("Role:", profile.role);
    }

}
}

checkAuthentication();
async function login(event) {
    event.preventDefault();

    document.getElementById('loginError').style.display = "none";

    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        document.getElementById('loginError').innerText ="Login failed. Please try again.";
        document.getElementById('loginError').style.display = "block";
        return;
    }

    const{data:profile,error:profileError}=await supabaseClient
        .from("profiles")
        .select("role")
        .eq("email",email)
        .single();

    if(profileError || !profile) {
        console.error("Profile not found");
        document.getElementById('loginError').innerText ="Profile not found. Please contact support.";
        document.getElementById('loginError').style.display = "block";
        await supabaseClient.auth.signOut();
        return;
    }
    if(profile.role==="admin" || profile.role==="owner"){
        console.log('Login successful:', data);
        window.location.href = 'main.html';
    }
    else if(profile.role==="employee"){
        console.log('Login successful:', data);
        window.location.href = 'Employee_Main.html';
    }
}
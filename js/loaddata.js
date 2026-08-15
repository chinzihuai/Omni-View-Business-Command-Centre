async function loadUserData() {

    const {
        data: { user },
        error: authError
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
        console.error("No logged-in user:", authError);
        window.location.href = "login.html";
        return;
    }

    console.log("Logged in email:", user.email);


    const { data, error } = await supabaseClient
        .from("profiles")
        .select("username, phone, email")
        .eq("email", user.email)
        .maybeSingle();


    if (error) {
        console.error("Profile loading error:", error);
        return;
    }


    if (!data) {
        console.error("Profile not found.");
        return;
    }


    console.log("Profile:", data);


    // Profile page
    const userNameElement =
        document.getElementById("user_name");

    const profileNameElement =
        document.getElementById("profile_name");

    const profileEmailElement =
        document.getElementById("profile_email");

    const profilePhoneElement =
        document.getElementById("profile_phone");

    const welcomename=
        document.getElementById("welcome_name");


    if (userNameElement) {
        userNameElement.innerText =
            `Welcome, ${data.username}!`;
    }

    if (profileNameElement) {
        profileNameElement.innerText =
            data.username;
    }

    if (profileEmailElement) {
        profileEmailElement.innerText =
            data.email;
    }

    if (profilePhoneElement) {
        profilePhoneElement.innerText =
            data.phone;
    }

    if(welcomename){
        welcomename.innerText =
            data.username;
    }


    // Edit profile page
    const updateName =
        document.getElementById("update_name");

    const updatePhone =
        document.getElementById("update_phone");


    if (updateName) {
        updateName.value = data.username;
    }

    if (updatePhone) {
        updatePhone.value = data.phone;
    }
}


document.addEventListener("DOMContentLoaded", function () {
    loadUserData();
});
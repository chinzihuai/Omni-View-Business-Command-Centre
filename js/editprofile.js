async function updateProfile(event) {

    event.preventDefault();


    // Get logged-in user
    const {
        data: { user },
        error: authError
    } = await supabaseClient.auth.getUser();


    if (authError || !user) {
        alert("Please login first.");
        window.location.href = "index.html";
        return;
    }


    // Get new values
    const username =
        document.getElementById("update_name").value.trim();

    const phone =
        document.getElementById("update_phone").value.trim();


    if (!username || !phone) {
        alert("Please fill in all fields.");
        return;
    }


    console.log("Updating:", user.email);
    console.log("New name:", username);
    console.log("New phone:", phone);


    // Update profile
    const { error } = await supabaseClient
        .rpc("update_my_profile", {
            p_username: username,
            p_phone: phone
        });


    if (error) {

        console.error("UPDATE ERROR:", error);

        alert(
            "Update failed: " +
            error.message
        );

        return;
    }


    console.log("Updated data:", data);


    if (!data || data.length === 0) {

        alert(
            "No profile was updated."
        );

        return;
    }


    // Success
    const message =
        document.getElementById("updateMessage");


    message.textContent =
        "Profile updated successfully!";

    message.classList.remove("d-none");

    message.style.display = "block";

    const {data:role, error: roleError} = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("email", user.email)
        .single();
    
    if (roleError) {
        console.error("ROLE ERROR:", roleError);
        alert("Failed to retrieve user role.");
    } else {
        // Redirect based on role
        if (role === "admin" || role === "owner") {
            setTimeout(function () {
                window.location.href = "main.html";
            }, 1500);
        } else if (role === "employee") {
            setTimeout(function () {
                window.location.href = "Employee_Profile.html";
            }, 1500);
        }
    }
}

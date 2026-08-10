async function updateProfile(event) {

    event.preventDefault();


    // Get logged-in user
    const {
        data: { user },
        error: authError
    } = await supabaseClient.auth.getUser();


    if (authError || !user) {
        alert("Please login first.");
        window.location.href = "login.html";
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
    const { data, error } = await supabaseClient
        .from("profiles")
        .update({
            username: username,
            phone: phone
        })
        .eq("email", user.email)
        .select();


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


    setTimeout(function () {
        window.location.href = "profile.html";
    }, 1500);
}
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



    console.log('Login successful:', data);
    window.location.href = 'main.html';
}
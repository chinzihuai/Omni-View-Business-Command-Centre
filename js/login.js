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

async function checksession(){
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user) {
        // User is logged in
        const {data:profile,error}=await supabaseClient
            .from("profiles")
            .select("role")
            .eq("email",user.email)
            .single();

        if(error || !profile) {
            console.error("Profile not found");
            await supabaseClient.auth.signOut();
            window.location.replace("login.html");
            return;
        }
        if(profile.role==="admin" || profile.role==="owner"){
            console.log('Login successful:', profile);
            window.location.href = 'main.html';
        }
        else if(profile.role==="employee"){
            console.log('Login successful:', profile);
            window.location.href = 'Employee_Main.html';
        }
}
} 

document.addEventListener('DOMContentLoaded', () => {
    const togglePassword = document.querySelector('#togglePassword');
    const togglePasswordIcon = togglePassword ? togglePassword.querySelector('i') : null;
    const password = document.querySelector('#password');

    if (!togglePassword || !togglePasswordIcon || !password) {
        console.error('Password toggle element(s) not found in login form.');
        return;
    }

    togglePassword.addEventListener('click', () => {
        const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
        const showPassword = type === 'text';

        password.setAttribute('type', type);
        togglePasswordIcon.classList.toggle('bi-eye', showPassword);
        togglePasswordIcon.classList.toggle('bi-eye-slash', !showPassword);
        togglePassword.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
    });
});

checksession()
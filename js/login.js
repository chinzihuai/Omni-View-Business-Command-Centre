async function login(event) {
    event.preventDefault();

    const loginButton = document.getElementById('loginButton');
    const loginButtonLabel = loginButton.querySelector('.button-label');
    const loginError = document.getElementById('loginError');
    const loginSuccess = document.getElementById('loginSuccess');

    loginError.style.display = 'none';
    loginSuccess.style.display = 'none';
    loginButton.disabled = true;
    loginButtonLabel.innerHTML =
        '<span class="spinner-border" role="status" aria-hidden="true"></span>Logging in...';

    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            loginError.innerText = 'Login failed. Please try again.';
            loginError.style.display = 'block';
            return;
        }

        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('email', email)
            .single();

        if (profileError || !profile) {
            console.error('Profile not found');
            loginError.innerText = 'Profile not found. Please contact support.';
            loginError.style.display = 'block';
            await supabaseClient.auth.signOut();
            return;
        }

        loginSuccess.innerText = 'Login successful. Redirecting...';
        loginSuccess.style.display = 'block';
        await new Promise((resolve) => setTimeout(resolve, 700));

        if (profile.role === 'admin' || profile.role === 'owner') {
            console.log('Login successful:', data);
            window.location.href = 'main.html';
        } else if (profile.role === 'employee') {
            console.log('Login successful:', data);
            window.location.href = 'Employee_Main.html';
        }
    } catch (error) {
        console.error('Login error', error);
        loginError.innerText = 'Login failed. Please try again.';
        loginError.style.display = 'block';
    } finally {
        loginButton.disabled = false;
        loginButtonLabel.innerText = 'Login';
    }
}

async function checksession() {
    const {
        data: { user },
    } = await supabaseClient.auth.getUser();

    if (user) {
        // User is logged in
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('email', user.email)
            .single();

        if (error || !profile) {
            console.error('Profile not found');
            await supabaseClient.auth.signOut();
            window.location.replace('login.html');
            return;
        }
        if (profile.role === 'admin' || profile.role === 'owner') {
            console.log('Login successful:', profile);
            window.location.href = 'main.html';
        } else if (profile.role === 'employee') {
            console.log('Login successful:', profile);
            window.location.href = 'Employee_Main.html';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const togglePassword = document.querySelector('#togglePassword');
    const togglePasswordIcon = togglePassword
        ? togglePassword.querySelector('i')
        : null;
    const password = document.querySelector('#password');

    if (!togglePassword || !togglePasswordIcon || !password) {
        console.error('Password toggle element(s) not found in login form.');
        return;
    }

    togglePassword.addEventListener('click', () => {
        const type =
            password.getAttribute('type') === 'password' ? 'text' : 'password';
        const showPassword = type === 'text';

        password.setAttribute('type', type);
        togglePasswordIcon.classList.toggle('bi-eye', showPassword);
        togglePasswordIcon.classList.toggle('bi-eye-slash', !showPassword);
        togglePassword.setAttribute(
            'aria-label',
            showPassword ? 'Hide password' : 'Show password'
        );
    });
});

checksession();

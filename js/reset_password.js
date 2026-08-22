document.addEventListener('DOMContentLoaded',async () => {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const resetButton = document.getElementById('resetPasswordBtn');
    const message = document.getElementById('message');

    const togglePassword = document.querySelector('#togglePassword');
    const togglePasswordIcon = togglePassword ? togglePassword.querySelector('i') : null;
    const toggleConfirmPassword = document.querySelector('#toggleConfirmPassword');
    const toggleConfirmPasswordIcon = toggleConfirmPassword ? toggleConfirmPassword.querySelector('i') : null;

    // Toggle password visibility
    if(!togglePassword || !toggleConfirmPassword|| !togglePasswordIcon || !toggleConfirmPasswordIcon) {
        console.error("Toggle password elements not found.");
        return;
    }
    
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const type = newPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            newPassword.setAttribute('type', type);
            togglePasswordIcon.classList.toggle('bi-eye');
            togglePasswordIcon.classList.toggle('bi-eye-slash');
        });
    }

    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', () => {
            const type = confirmPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPassword.setAttribute('type', type);
            toggleConfirmPasswordIcon.classList.toggle('bi-eye');
            toggleConfirmPasswordIcon.classList.toggle('bi-eye-slash');
        });
    }

    function showMessage(text, type = "danger") {
        message.innerHTML=`
            <div class="alert alert-${type}" role="alert">
                ${text}
            </div>
        `;
    }

    const{data:{session},error:sessionError}=await supabaseClient.auth.getSession();

    if(sessionError){
        console.error("Error retrieving session:", sessionError);
        showMessage("Error retrieving session: " + sessionError.message);
        resetButton.disabled = true;
        return;
    }

    if (!session) {
        console.error("No active session found.");
        showMessage("This password reset link is invalid or has expired. Please request a new password reset email.");
        resetButton.disabled = true;
        return;
    }

    console.log("Password recovery session detected.");

    resetPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const password = newPassword.value;
        const confirmPasswordValue = confirmPassword.value;

        if(password.length < 6) {
            showMessage("Password must be at least 6 characters long.", "danger");
            return;
        }

        if(password !== confirmPasswordValue) {
            showMessage("Passwords do not match.", "danger");
            return;
        }
        
        resetButton.disabled = true;
        resetButton.textContent = "Resetting...";

        message.innerHTML = '';

        try{
            const{error}=await supabaseClient.auth.updateUser({
                password: password
            });
            if(error) {
                console.error("Error resetting password:", error);
                showMessage("Error resetting password: " + error.message);
                resetButton.disabled = false;
                resetButton.textContent = "Reset Password";
                return;
            }
            showMessage("Password reset successfully!", "success");

            await supabaseClient.auth.signOut();
            setTimeout(() => {
                window.location.href = "./login.html";
            }, 2000);

        } catch(error) {
            console.error("Error resetting password:", error);
            showMessage("Error resetting password: " + error.message);
        } finally {
            resetButton.disabled = false;
            resetButton.textContent = "Reset Password";
        }
    });
});
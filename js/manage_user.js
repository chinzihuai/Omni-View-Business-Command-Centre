let UserTable;
let currentUserRole;
let isAddingUser = false;
let isDeletingUser = false;

async function loadUser() {
    const {data:{session},error}=await supabaseClient.auth.getSession();

    if(error || !session) {
    window.location.replace("login.html");
    }

    const{data:profile,error:profileError}=await supabaseClient
        .from("profiles")
        .select("role")
        .eq("email",session.user.email)
        .single();

    if(error || !profile) {
        console.error("Profile not found");
        await supabaseClient.auth.signOut();
        window.location.replace("login.html");
    }

    currentUserRole = profile.role;

    if(!UserTable) {
       UserTable = new DataTable('#UserTable', {
        pageLength: 10,
        lengthMenu: [5, 10, 25, 50,100],
        paging: true,
        ordering: true,
        info: true
       });
    }

    UserTable.clear();

    if(profile.role == "admin") {
        const {data:users,error:usersError}=await supabaseClient
            .from("profiles")
            .select("userid, username, email, phone, role, hourly_rate")
            .eq("role","employee");
        
        if (usersError) {
        console.error("Error fetching users:", usersError);
        return;
        }
        else{users.forEach(user => {
        UserTable.row.add([
            user.userid,
            user.username,
            user.email,
            user.phone,
            user.role,
            user.hourly_rate,
            `<button class="btn btn-warning btn-sm"
                    onclick="editUser(this, '${user.userid}')">
                    <i class="bi bi-pencil"></i> Edit
            </button>
            <button class="btn btn-danger btn-sm"
                    onclick="deleteUser('${user.userid}')">
                    <i class="bi bi-trash"></i> Delete
            </button>
            `
        ]);
    });
    UserTable.draw();
}

    }
    else if (profile.role == "owner") {
        const {data:users,error:usersError}=await supabaseClient
            .from("profiles")
            .select("userid, username, email, phone, role, hourly_rate");
        
        if (usersError) {
        console.error("Error fetching users:", usersError);
        return;
        }
        else {users.forEach(user => {
        UserTable.row.add([
            user.userid,
            user.username,
            user.email,
            user.phone,
            user.role,
            user.hourly_rate,
            `<button class="btn btn-warning btn-sm"
                    onclick="editUser(this, '${user.userid}')">
                    <i class="bi bi-pencil"></i> Edit
            </button>
            <button class="btn btn-danger btn-sm"
                    onclick="deleteUser('${user.userid}')">
                    <i class="bi bi-trash"></i> Delete
            </button>
            `
        ]);
    });
    UserTable.draw();
    }

    }
}

async function editUser(button, userId) {
    const row = UserTable.row(button.closest('tr'));
    const data = row.data();

    if(!row){
        console.error("Row not found for the clicked button.");
        return;
    }

    const roleOptions = currentUserRole === 'owner'
        ? '<option value="employee">Employee</option><option value="admin">Admin</option>'
        : '<option value="employee">Employee</option>';

    row.data([
        data[0],
        `<input type="text" class="form-control" value="${data[1]}">`,
        data[2],
        `<input type="text" class="form-control" value="${data[3]}">`,
        `<select class="form-select" id="editRole">${roleOptions}</select>`,
        `<input type="number" class="form-control" value="${data[5]}">`,
        `<button class="btn btn-success btn-sm" onclick="saveUser('${data[0]}', this)"><i class="bi bi-check"></i> Save</button> ` +
        `<button class="btn btn-secondary btn-sm" onclick="loadUser()"><i class="bi bi-x"></i> Cancel</button>`
    ]).draw(false);

    // pre-select the current role now that the <select> is in the DOM
    const rowNode = UserTable.row(row.index()).node();
    const roleSelect = rowNode.querySelector('#editRole');
    if (roleSelect) roleSelect.value = data[4];
}

async function deleteUser(userId) {
    if (isDeletingUser) {
        return;
    }

    if (!userId) {
        alert("Invalid User ID.");
        return;
    }

    const confirmDelete = confirm(
        "Are you sure you want to delete user " + userId + "?"
    );

    if (!confirmDelete) {
        return;
    }

    isDeletingUser = true;

    try{
        const { data, error } =
            await supabaseClient.functions.invoke(
                'delete-user',
                {
                    body: {
                        userId: userId
                    }
                }
            );

        if (error) {
            console.error(
                "Error calling delete-user:",
                error
            );

            alert(
                "Failed to delete user: " +
                error.message
            );

            return;
        }

        if (!data || !data.success) {

            console.error(
                "Delete user failed:",
                data
            );

            alert(
                "Failed to delete user: " +
                (data?.message || "Unknown error")
            );

            return;
        }

        alert("User deleted successfully!");
        await loadUser();
    }
    catch (err) {
        console.error("Unexpected error:", err);
        alert(
            "An unexpected error occurred: " +
            err.message
        );
    }
    finally {
        isDeletingUser = false;
    }
}

async function addUser() {
    const addButton = document.getElementById('add_user_button');

    if (isAddingUser) {
        return;
    }

    isAddingUser = true;
    addButton.disabled = true;
    addButton.textContent = "Adding...";

try {
    const userId = document.getElementById('UserID').value;
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const role = document.getElementById('role').value;
    const password = document.getElementById('password').value;
    const hourlyRate = document.getElementById('hourlyRate').value;

    if (!username || !email || !password || !hourlyRate) {
        alert("All fields are required.");
        return;
    }

    if (isNaN(hourlyRate) || Number(hourlyRate) < 0) {
        alert("Hourly Rate must be a non-negative number.");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        alert("Please enter a valid email address.");
        return;
    }

        // CHECK DUPLICATE USER ID
        const { data: existingUser, error: checkError } =
            await supabaseClient
                .from('profiles')
                .select('userid')
                .eq('userid', userId)
                .maybeSingle();

        if (checkError) {
            console.error("Error checking User ID:", checkError);
            alert("Unable to check User ID.");
            return;
        }

        if (existingUser) {
            alert("User ID already exists.");
            return;
        }

        // CHECK DUPLICATE EMAIL
        const { data: existingEmail, error: emailCheckError } =
            await supabaseClient
                .from('profiles')
                .select('email')
                .eq('email', email)
                .maybeSingle();

        if (emailCheckError) {
            console.error("Error checking email:", emailCheckError);
            alert("Unable to check email.");
            return;
        }

        if (existingEmail) {
            alert("Email already exists.");
            return;
        }

        // CREATE SUPABASE AUTH USER
        const { data, error } =
            await supabaseClient.functions.invoke(
                'create-user',
                {
                    body: {
                        userId: userId,
                        username: username,
                        email: email,
                        phone: phone,
                        role: role,
                        password: password,
                        hourlyRate: Number(hourlyRate)
                    }
                }
            );

            if (error) {
            console.error("Error calling create-user:", error);

            alert(
                "Failed to create user: " +
                error.message
            );

            return;
        }
            if (!data || !data.success) {

            console.error("Create user failed:", data);

            alert(
                "Failed to create user: " +
                (data?.message || "Unknown error")
            );

            return;
        }

        alert("User added successfully!");

        const userModalEl =
            document.getElementById('userModal');

        if (userModalEl) {

            const userModal =
                bootstrap.Modal.getInstance(userModalEl);

            if (userModal) {
                userModal.hide();
            }
        }

        const userForm =
            document.getElementById('userForm');

        if (userForm) {
            userForm.reset();
        }

        await loadUser();
    }
catch (err) {

        console.error("Unexpected error:", err);

        alert(
            "An unexpected error occurred: " +
            err.message
        );
}
finally {
        // Always enable button again
        isAddingUser = false;
        addButton.disabled = false;
        addButton.textContent = "Add User";
}
}

async function saveUser(userId, button) {
    const row = button.closest('tr');
    const inputs = row.querySelectorAll('input');
    const roleSelect = row.querySelector('#editRole');

    const newUsername = inputs[0].value;
    const newPhone = inputs[1].value;
    const newHourlyRate = inputs[2].value;
    const newRole = roleSelect ? roleSelect.value : undefined;

    const { error } = await supabaseClient
        .from('profiles')
        .update({
            username: newUsername,
            phone: newPhone,
            role: newRole,
            hourly_rate: newHourlyRate
        })
        .eq('userid', userId);

    if (error) {
        console.error("Error saving user:", error);
        alert("Failed to save changes: " + error.message);
        return;
    }

    await loadUser();
}

async function getNextUserID() {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('userid')
        .order('userid', { ascending: false })
        .limit(1);
    
    if (error) {
        console.error('Error fetching last user ID:', error);
        return null;
    }

    if (data.length === 0) {
        return 'User0001'; // If no users exist, start with User0001
    }
    
    const lastId = data[0].userid;

    // Get the number part
    const number = parseInt(lastId.replace("User", ""), 10);

    // Increase by 1
    const nextNumber = number + 1;

    // Keep 4 digits
    const nextId = String(nextNumber).padStart(4, "0");

    return `User${nextId}`;
}

document.addEventListener('DOMContentLoaded', function() {

    document.getElementById('add_user_data').addEventListener('click', async function() {
        const nextUserID = await getNextUserID();
        if (nextUserID === null) {
            console.error("Error generating next user ID");
            return;
        }
        document.getElementById('UserID').value = nextUserID;

        const roleSelect = document.getElementById('role');
        roleSelect.innerHTML = '';
        roleSelect.innerHTML += `
        <option value="employee">Employee</option>
        `;

        if (currentUserRole  === 'owner') {
        roleSelect.innerHTML += `
            <option value="admin">Admin</option>
        `;
        }
    
        
        const usermodal = new bootstrap.Modal(document.getElementById('userModal'));
        usermodal.show();
        
    });

});    

document.addEventListener('DOMContentLoaded', () => {
    loadUser();
});
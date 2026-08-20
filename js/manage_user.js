let UserTable;
let currentUserRole;
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
    if (!confirm(`Delete user ${userId}? This cannot be undone.`)) return;

    const { error } = await supabaseClient
        .from('profiles')
        .delete()
        .eq('userid', userId);

    if (error) {
        console.error("Error deleting user:", error);
        alert("Failed to delete user: " + error.message);
        return;
    }

    await loadUser();
}

async function addUser() {
    const userId = document.getElementById('UserID').value;
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const role = document.getElementById('role').value;

    if (!username || !email) {
        alert("Username and email are required.");
        return;
    }

    const { error } = await supabaseClient
        .from('profiles')
        .insert([{
            userid: userId,
            username: username,
            email: email,
            phone: phone,
            role: role
        }]);

    if (error) {
        console.error("Error adding user:", error);
        alert("Failed to add user: " + error.message);
        return;
    }

    const userModalEl = document.getElementById('userModal');
    const userModal = bootstrap.Modal.getInstance(userModalEl);
    if (userModal) userModal.hide();

    document.getElementById('payoutForm').reset();

    await loadUser();
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
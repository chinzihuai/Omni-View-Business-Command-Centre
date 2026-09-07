let LiveTable;

function calculateDurationHours(startTime, endTime) {
    if (!startTime || !endTime) return null;

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    if ([startH, startM, endH, endM].some(Number.isNaN)) return null;

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // handle sessions that cross midnight (end time earlier than or equal to start time)
    if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60;
    }

    return Number(((endMinutes - startMinutes) / 60).toFixed(2));
}

function setTableSortLock(locked, tableSelector) {
    const wrapper = document.querySelector(tableSelector);
    if (!wrapper) return;
    const thead = wrapper.querySelector('thead');
    const paginate = wrapper
        .closest('.dataTables_wrapper')
        ?.querySelector('.dataTables_paginate');

    [thead, paginate].forEach((el) => {
        if (!el) return;
        el.style.pointerEvents = locked ? 'none' : '';
        el.style.opacity = locked ? '0.6' : '';
        el.style.cursor = locked ? 'not-allowed' : '';
    });
}

async function loadlives() {
    const { data, error } = await supabaseClient.from('Live').select('*');

    if (error) {
        console.error('Error fetching live sessions:', error);
        alert(
            'Error fetching live sessions. Please check the console for details.'
        );
        return;
    }

    if (!LiveTable) {
        LiveTable = new DataTable('#LiveTable', {
            pageLength: 5,
            lengthMenu: [5, 10, 25, 50, 100],
            paging: true,
            ordering: true,
            info: true,
        });
    }

    LiveTable.clear();

    data.forEach((Live) => {
        LiveTable.row.add([
            Live.Session_id,
            Live.employee_id,
            Live.session_date,
            Live.day_of_week,
            Live.start_time,
            Live.end_time,
            Live.duration_hours,
            Live.items_sold,
            Live.gmv_amount,
            Live.views,

            `
                <button class="btn btn-warning btn-sm"
                    onclick="editLives(this, '${Live.Session_id}')">
                    <i class="bi bi-pencil"></i> Edit
                </button>

                <button class="btn btn-danger btn-sm"
                    onclick="deleteLives('${Live.Session_id}')">
                    <i class="bi bi-trash"></i> Delete
                </button>
            `,
        ]);
    });

    LiveTable.draw();
}

async function editLives(button, sessionId) {
    const tr = button.closest('tr');
    const row = LiveTable.row(tr);
    const data = row.data();

    if (!row || !data) {
        console.error('Row not found for Session ID:', sessionId);
        return;
    }

    const cells = tr.querySelectorAll('td');

    cells[2].innerHTML = `<input type="date" class="form-control" value="${data[2]}">`;
    cells[3].innerHTML = `<input type="text" class="form-control" style="width: 100px;" value="${data[3]}">`;
    cells[4].innerHTML = `<input type="time" class="form-control edit-start-time" value="${data[4]}">`;
    cells[5].innerHTML = `<input type="time" class="form-control edit-end-time" value="${data[5]}">`;
    cells[6].innerHTML = `<input type="number" class="form-control edit-duration" value="${data[6]}" readonly style="background-color:#f2efe7;">`;
    cells[7].innerHTML = `<input type="number" class="form-control" value="${data[7]}">`;
    cells[8].innerHTML = `<input type="number" class="form-control" value="${data[8]}">`;
    cells[9].innerHTML = `<input type="number" class="form-control" value="${data[9]}">`;
    cells[10].innerHTML = `
        <button class="btn btn-success btn-sm"
            onclick="saveLives(this, '${data[0]}')">
            <i class="bi bi-check"></i> Save
        </button>
        <button class="btn btn-secondary btn-sm"
            onclick="cancelEditLives()">
            <i class="bi bi-x"></i> Cancel
        </button>
    `;

    setTableSortLock(true);

    const startInput = tr.querySelector('.edit-start-time');
    const endInput = tr.querySelector('.edit-end-time');
    const durationInput = tr.querySelector('.edit-duration');

    function refreshDuration() {
        const duration = calculateDurationHours(
            startInput.value,
            endInput.value
        );
        durationInput.value = duration === null ? '' : duration;
    }

    startInput.addEventListener('change', refreshDuration);
    endInput.addEventListener('change', refreshDuration);
}

function cancelEditLives() {
    setTableSortLock(false);
    loadlives();
}

async function saveLives(button, sessionId) {
    const row = LiveTable.row(button.closest('tr'));
    const inputs = button.closest('tr').querySelectorAll('input');

    const newSessionDate = inputs[0].value.trim();
    const newDayOfWeek = inputs[1].value.trim();
    const newStart_time = inputs[2].value.trim();
    const newEnd_time = inputs[3].value.trim();
    const newItemsSold = inputs[5].value.trim();
    const newSoldAmount = inputs[6].value.trim();
    const newViews = inputs[7].value.trim();

    if (
        !newSessionDate ||
        !newDayOfWeek ||
        !newStart_time ||
        !newEnd_time ||
        !newItemsSold ||
        !newSoldAmount ||
        !newViews
    ) {
        alert('All fields are required!');
        return;
    }

    const durationHours = calculateDurationHours(newStart_time, newEnd_time);
    const itemsSold = Number(newItemsSold);
    const soldAmount = Number(newSoldAmount);
    const views = Number(newViews);

    if (
        durationHours === null ||
        isNaN(itemsSold) ||
        isNaN(soldAmount) ||
        isNaN(views)
    ) {
        alert(
            'Start Time, End Time, Items Sold, Sold Amount, and Views must be valid!'
        );
        return;
    }

    if (durationHours < 0 || itemsSold < 0 || soldAmount < 0 || views < 0) {
        alert(
            'Duration, Items Sold, Sold Amount, and Views cannot be negative!'
        );
        return;
    }

    const { data, error } = await supabaseClient
        .from('Live')
        .update({
            session_date: newSessionDate,
            day_of_week: newDayOfWeek,
            start_time: newStart_time,
            end_time: newEnd_time,
            duration_hours: durationHours,
            items_sold: itemsSold,
            gmv_amount: soldAmount,
            views: views,
        })
        .eq('Session_id', sessionId);

    if (error) {
        console.error('Error updating live data:', error);
        alert('Error updating live data!');
        return;
    }

    alert('Live data updated successfully!');

    setTableSortLock(false);
    loadlives();
}

async function deleteLives(sessionId) {
    if (!confirm('Are you sure you want to delete this live session?')) {
        return;
    }

    console.log('Deleting live session with Session ID:', sessionId);

    const { data, error } = await supabaseClient
        .from('Live')
        .delete()
        .eq('Session_id', sessionId);

    if (error) {
        console.error('Error deleting live session:', error);
        alert('Error deleting live session!');
        return;
    }

    alert('Live session deleted successfully!');

    loadlives();
}

async function loadEmployeeOptions() {
    const select = document.getElementById('employeeId');

    if (!select) {
        return;
    }

    select.innerHTML = '<option value="">Loading employees...</option>';

    const { data, error } = await fetchStaffProfiles();

    if (error) {
        console.error('Error loading employee IDs:', error);
        select.innerHTML = '<option value="">Unable to load employees</option>';
        return;
    }

    if (!data || data.length === 0) {
        select.innerHTML = '<option value="">No employee found</option>';
        return;
    }

    const employees = data
        .map((profile) => ({
            id: profile.userid,
            name: profile.username || profile.userid,
        }))
        .filter((item) => item.id)
        .filter(
            (item, index, array) =>
                array.findIndex((x) => x.id === item.id) === index
        );

    if (employees.length === 0) {
        select.innerHTML = '<option value="">No employee ID found</option>';
        return;
    }

    const options = employees
        .map(({ id, name }) => `<option value="${id}">${name} (${id})</option>`)
        .join('');

    select.innerHTML = `<option value="">Select employee</option>${options}`;
}

document.addEventListener('DOMContentLoaded', function () {
    document
        .getElementById('add_lives_data')
        .addEventListener('click', async function () {
            const nextId = await getNextSessionId();

            if (nextId === null) {
                alert('Unable to generate Session ID.');
                return;
            }
            document.getElementById('sessionId').value = nextId;

            const productModal = new bootstrap.Modal(
                document.getElementById('addLiveModal')
            );

            productModal.show();
        });
});

async function getNextSessionId() {
    const { data, error } = await supabaseClient
        .from('Live')
        .select('Session_id')
        .order('Session_id', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error getting last Session ID:', error);
        return null;
    }

    // No sessions yet
    if (data.length === 0) {
        return 'S0001';
    }

    const lastId = data[0].Session_id;

    // Get the number part
    const number = parseInt(lastId.replace('S', ''), 10);

    // Increase by 1
    const nextNumber = number + 1;

    // Keep 4 digits
    const nextId = String(nextNumber).padStart(4, '0');

    return `S${nextId}`;
}

async function addLiveData() {
    const sessionId = document.getElementById('sessionId').value.trim();
    const employeeId = document.getElementById('employeeId').value.trim();
    const liveDate = document.getElementById('liveDate').value.trim();
    const dayOfWeek = document.getElementById('dayOfWeek').value.trim();
    const startTime = document.getElementById('startTime').value.trim();
    const endTime = document.getElementById('endTime').value.trim();
    const itemsSold = document.getElementById('itemsSold').value.trim();
    const gmvAmount = document.getElementById('gmvAmount').value.trim();
    const views = document.getElementById('views').value.trim();

    if (
        !sessionId ||
        !employeeId ||
        !liveDate ||
        !dayOfWeek ||
        !startTime ||
        !endTime ||
        !itemsSold ||
        !gmvAmount ||
        !views
    ) {
        alert('All fields are required!');
        return;
    }

    const duration = calculateDurationHours(startTime, endTime);
    const items = Number(itemsSold);
    const gmv = Number(gmvAmount);
    const viewCount = Number(views);

    if (duration === null || isNaN(items) || isNaN(gmv) || isNaN(viewCount)) {
        alert(
            'Start Time, End Time, Items Sold, GMV Amount, and Views must be valid!'
        );
        return;
    }

    if (duration < 0 || items < 0 || gmv < 0 || viewCount < 0) {
        alert(
            'Duration, Items Sold, GMV Amount, and Views cannot be negative!'
        );
        return;
    }

    const { data, error } = await supabaseClient.from('Live').insert([
        {
            Session_id: sessionId,
            employee_id: employeeId,
            session_date: liveDate,
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
            duration_hours: duration,
            items_sold: items,
            gmv_amount: gmv,
            views: viewCount,
        },
    ]);

    if (error) {
        if (error.code === '23505') {
            // Unique violation error code
            alert(
                'Session ID already exists. Please use a different Session ID.'
            );
        } else {
            alert('Error adding live session!');
        }
        console.error('Error adding live session:', error);
        return;
    }

    alert('Live session added successfully!');

    const modalElement = document.getElementById('addLiveModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);

    modalInstance.hide();

    loadlives();
}

document.addEventListener('DOMContentLoaded', () => {
    const liveDateInput = document.getElementById('liveDate');
    const dayOfWeek = document.getElementById('dayOfWeek');

    liveDateInput.addEventListener('change', () => {
        if (!liveDateInput.value) {
            dayOfWeek.value = '';
            return;
        }

        const [year, month, day] = liveDateInput.value.split('-');
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        dayOfWeek.value = days[date.getDay()];
    });

    loadlives();
    loadEmployeeOptions();
});

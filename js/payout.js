let PayoutTable;

async function loadPayouts() {
    const { data, error } = await supabaseClient
        .from('Payout')
        .select('*');
    
    if (error) {
        console.error('Error loading payouts:', error);
        return;
    }

    if(!PayoutTable){
        PayoutTable = new DataTable('#PayoutTable', {
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50,100],
            paging: true,
            ordering: true,
            info: true
        });
    }

    PayoutTable.clear();

    data.forEach(payout => {
        PayoutTable.row.add([
            payout.payout_id,
            payout.employee_id,
            payout.employee_name,
            payout.period_start_date,
            payout.period_end_date,
            payout.total_hours_worked,
            payout.total_items_sold,
            payout.total_gmv,
            Number(payout.base_payment).toFixed(2),
            Number(payout.bonus_amount).toFixed(2),
            Number(payout.final_payout).toFixed(2),
            payout.payout_date,
            
            `
                <button class="btn btn-danger btn-sm"
                    onclick="deletePayout('${payout.payout_id}')">
                    <i class="bi bi-trash"></i> Delete
                </button>
            `   
        ]);
    });

    PayoutTable.draw();

}

async function deletePayout(payoutId) {

    if (!confirm('Are you sure you want to delete this payout?')) {
        return;
    }
        
    const { error } = await supabaseClient
        .from('Payout')
        .delete()
        .eq('payout_id', payoutId);
    
    if (error) {
        console.error('Error deleting payout:', error);
        alert('Failed to delete payout. Please try again.');
        return;
    }

    alert('Payout deleted successfully.');
    loadPayouts();
}

async function addPayout() {
    const payoutId = document.getElementById('payoutID').value;
    const employeeId = document.getElementById('payoutEmployee').value;
    const periodStart = document.getElementById('periodStart').value;
    const periodEnd = document.getElementById('periodEnd').value;
    const bonusPerItemValue = Number(document.getElementById('bonusPerItem').value) || 0;

    if (!payoutId || !employeeId || !periodStart || !periodEnd) {
        alert('Please fill in all required fields.');
        return;
    }

    if (isNaN(bonusPerItemValue)) {
        alert('Please enter a valid bonus amount per item.');
        return;
    }

    if(Number(bonusPerItemValue) < 0){
        alert('Bonus amount per item cannot be negative.');
        return;
    }

    const payoutMetrics = await calculatePayoutMetrics(employeeId, periodStart, periodEnd, bonusPerItemValue, true);

    if (!payoutMetrics) {
        resetPreview();
        return;
    }

    const periodHours = payoutMetrics.totalHours;
    const periodItems = payoutMetrics.totalItems;
    const periodGMV = payoutMetrics.totalGMV;
    const basePayment = payoutMetrics.basePayment;
    const bonusAmount = payoutMetrics.bonusAmount;
    const finalPayout = payoutMetrics.finalPayout;

    const { data: employee, error: employeeError } = await supabaseClient
        .from('profiles')
        .select('username')
        .eq('userid', employeeId)
        .single();
    
    if (employeeError) {
        console.error('Error fetching employee data:', employeeError);
        alert('Failed to fetch employee data. Please try again.');
        return;
    }

    const employeeName = employee.username || '';

    const { error } = await supabaseClient
        .from('Payout')
        .insert([{ 
            payout_id: payoutId,
            employee_id: employeeId,
            employee_name: employeeName,
            period_start_date: periodStart,
            period_end_date: periodEnd,
            total_hours_worked: periodHours,
            total_items_sold: periodItems,
            total_gmv: periodGMV,
            base_payment: basePayment,
            bonus_amount: bonusAmount,
            final_payout: finalPayout,
            payout_date: new Date().toISOString().split('T')[0]
        }])
    
    if (error) {
        console.error('Error adding payout:', error);

        if (error.code === '23505') { // Unique violation error code
            alert('Payout ID already exists. Please use a different ID.');
        }
        else {
        alert('Failed to add payout. Please try again.');
        }

        return;
    }

    alert('Payout added successfully.');

    const payoutmodal = document.getElementById('payoutModal');
    const modalInstance = bootstrap.Modal.getInstance(payoutmodal);

    modalInstance.hide();

    loadPayouts();
}

async function calculatePayoutMetrics(employeeId, periodStart, periodEnd, bonusPerItemValue, showNoDataAlert = false) {
    if (!employeeId || !periodStart || !periodEnd) {
        return null;
    }

    if (new Date(periodStart) > new Date(periodEnd)) {
        if (showNoDataAlert) {
            alert('End date cannot be earlier than start date. Please select valid dates.');
        }
        return null;
    }

    const { data: employee, error: employeeError } = await supabaseClient
        .from('profiles')
        .select('hourly_rate')
        .eq('userid', employeeId)
        .single();

    if (employeeError) {
        console.error('Error fetching employee data:', employeeError);
        return null;
    }

    const baseRate = Number(employee.hourly_rate) || 0;

    const nextDay = new Date(periodEnd);
    nextDay.setDate(nextDay.getDate() + 1);

    const { data: liveData, error: liveError } = await supabaseClient
        .from('Live')
        .select('duration_hours,items_sold,gmv_amount,session_date')
        .eq('employee_id', employeeId)
        .gte('session_date', periodStart)
        .lt('session_date', nextDay.toISOString().split('T')[0]);

    if (liveError) {
        console.error('Error fetching live data:', liveError);
        return null;
    }

    if (!liveData || liveData.length === 0) {
        if (showNoDataAlert) {
            alert('No work hours or item sales data found in Live for the selected date range. Please choose another start and end date.');
        }
        return null;
    }

    let totalHours = 0;
    let totalItems = 0;
    let totalGMV = 0;

    liveData.forEach(live => {
        totalHours += Number(live.duration_hours) || 0;
        totalItems += Number(live.items_sold) || 0;
        totalGMV += Number(live.gmv_amount) || 0;
    });

    const basePayment = totalHours * baseRate;
    const bonusAmount = totalItems * bonusPerItemValue;
    const finalPayout = basePayment + bonusAmount;

    return {
        totalHours,
        totalItems,
        totalGMV,
        baseRate,
        basePayment,
        bonusAmount,
        finalPayout
    };
}

async function getNextPayoutID() {
    const { data, error } = await supabaseClient
        .from('Payout')
        .select('payout_id')
        .order('payout_id', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching next payout ID:', error);
        return null;
    }

    if (data.length === 0) {
        return 'Payout0001';
    }

    const lastPayoutID = data[0].payout_id;
    const lastNumber = parseInt(lastPayoutID.replace('Payout', ''), 10);
    const nextNumber = lastNumber + 1;
    const nextPayoutID = String(nextNumber).padStart(4, '0');
    return `Payout${nextPayoutID}`;
}

async function loadEmployees() {
    const select = document.getElementById('payoutEmployee');

    if (!select) {
        return;
    }

    select.innerHTML = '<option value="">Loading employees...</option>';

    const { data, error } = await supabaseClient
        .from('profiles')
        .select('userid, username, role')
        .in('role', ['employee', 'Owner']);

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
        .map(profile => ({
            id: profile.userid,
            name: profile.username || profile.userid
        }))
        .filter(item => item.id)
        .filter((item, index, array) => array.findIndex(x => x.id === item.id) === index);

    if (employees.length === 0) {
        select.innerHTML = '<option value="">No employee ID found</option>';
        return;
    }

    const options = employees
        .map(({ id, name }) => `<option value="${id}">${name} (${id})</option>`)
        .join('');

    select.innerHTML = `<option value="">Select employee</option>${options}`;
}

async function previewPayout() {
    
    const employeeId = document.getElementById('payoutEmployee').value;
    const periodStart = document.getElementById('periodStart').value;
    const periodEnd = document.getElementById('periodEnd').value;
    const bonusPerItemValue = Number(document.getElementById('bonusPerItem').value) || 0;

    if (!employeeId || !periodStart || !periodEnd){
        resetPreview();
        return;
    }

    if (new Date(periodStart) > new Date(periodEnd)) {
        resetPreview();
        return;
    }

    const payoutMetrics = await calculatePayoutMetrics(employeeId, periodStart, periodEnd, bonusPerItemValue, true);

    if (!payoutMetrics) {
        resetPreview();
        return;
    }

    // DISPLAY PREVIEW
    document.getElementById('previewHours').textContent = payoutMetrics.totalHours;
    document.getElementById('previewSales').textContent = payoutMetrics.totalItems;
    document.getElementById('previewGMV').textContent = payoutMetrics.totalGMV.toFixed(2);
    document.getElementById('previewRate').textContent = payoutMetrics.baseRate.toFixed(2);
    document.getElementById('previewBase').textContent = payoutMetrics.basePayment.toFixed(2);
    document.getElementById('previewBonus').textContent = payoutMetrics.bonusAmount.toFixed(2);
    document.getElementById('previewTotal').textContent = payoutMetrics.finalPayout.toFixed(2);
}

async function validatePayoutForm() {
    const startDate = document.getElementById('periodStart').value;
    const endDate = document.getElementById('periodEnd').value;
    
    if(!startDate || !endDate){
        return true;
    }

    if(new Date(endDate) < new Date(startDate)){
        alert('End date cannot be earlier than start date. Please select valid dates.');
        document.getElementById('periodEnd').value = '';
        resetPreview();
        return false;
    }

    return true;
}

function resetPreview() {
    document.getElementById('previewHours').textContent = 0;
    document.getElementById('previewSales').textContent = 0;
    document.getElementById('previewGMV').textContent = '0.00';
    document.getElementById('previewRate').textContent = '0.00';
    document.getElementById('previewBase').textContent = '0.00';
    document.getElementById('previewBonus').textContent = '0.00';
    document.getElementById('previewTotal').textContent = '0.00';
}

addEventListener('DOMContentLoaded', () => {
    document.getElementById('add_payout_data').addEventListener('click', async (event) => {
        const nextID = await getNextPayoutID();

        if (nextID === null) {
            alert('Failed to generate next payout ID. Please try again.');
            return;
        }

        document.getElementById('payoutID').value = nextID;

        const payoutmodal = new bootstrap.Modal(document.getElementById('payoutModal'));

        payoutmodal.show();
    })
});

document.addEventListener('DOMContentLoaded', () => {
    loadPayouts();
    loadEmployees();

    document.getElementById('periodStart').addEventListener('change', () => {
        if (validatePayoutForm()) {
        previewPayout();
        }
    });
    document.getElementById('periodEnd').addEventListener('change', () => {
        if (validatePayoutForm()) {
            previewPayout();
        }
    });

    document.getElementById('payoutEmployee').addEventListener('change', previewPayout);
    document.getElementById('bonusPerItem').addEventListener('input', previewPayout);
    
});
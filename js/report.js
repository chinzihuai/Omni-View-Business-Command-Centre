//sales report
async function loadSalesReport(filter) {
    console.log('Loading Sales Report with filter:', filter);

    let query = supabaseClient
        .from('Live')
        .select('session_date, items_sold, gmv_amount')
        .gte('session_date', filter.startDate)
        .lte('session_date', filter.endDate)
        .order('session_date', { ascending: true });

    //employee filter
    if (filter.employeeId && filter.employeeId !== 'all') {
        query = query.eq('employee_id', filter.employeeId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching sales report:', error);
        alert(
            'An error occurred while fetching the sales report. Please try again.'
        );
        return;
    }

    console.log('Sales Report Data:', data);

    let totalGMV = 0;
    let totalItems = 0;

    data.forEach((row) => {
        totalGMV += row.gmv_amount || 0;
        totalItems += row.items_sold || 0;
    });

    const averageGMV = data.length > 0 ? totalGMV / data.length : 0;

    document.getElementById('salesTotalGMV').textContent =
        `RM ${totalGMV.toFixed(2)}`;
    document.getElementById('salesTotalItems').textContent =
        totalItems.toLocaleString();
    document.getElementById('salesAverageGMV').textContent =
        `RM ${averageGMV.toFixed(2)}`;

    //chart
    loadSalesChart(data);
}

//sales chart
let salesChart = null;

function loadSalesChart(data) {
    const canva = document.getElementById('salesChart').getContext('2d');

    if (salesChart) {
        salesChart.destroy();
    }

    //group gmv by date
    const dailySales = {};

    data.forEach((row) => {
        const date = row.session_date;

        if (!dailySales[date]) {
            dailySales[date] = {
                gmv: 0,
                items: 0,
            };
        }

        dailySales[date].gmv += row.gmv_amount || 0;
        dailySales[date].items += row.items_sold || 0;
    });

    const labels = Object.keys(dailySales);
    const gmvData = labels.map((date) => dailySales[date].gmv);

    salesChart = new Chart(canva, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'GMV',
                    data: gmvData,
                    tension: 0.3,
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,

                    title: {
                        display: true,
                        text: 'GMV (RM)',
                    },
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date',
                    },
                },
            },
        },
    });
}

//load employee report
async function loadEmployeeReport(filter) {
    console.log('Loading Employee Report with filter:', filter);

    const { data: liveData, error: liveError } = await supabaseClient
        .from('Live')
        .select(
            `session_date, employee_id,duration_hours,views,items_sold,gmv_amount`
        )
        .gte('session_date', filter.startDate)
        .lte('session_date', filter.endDate)
        .order('session_date', { ascending: true });

    if (liveError) {
        console.error(
            'Error fetching live data for employee report:',
            liveError
        );
        alert(
            'An error occurred while fetching the employee report. Please try again.'
        );
        return;
    }

    //load profiles for employee names
    const { data: profiles, error: profileError } = await supabaseClient
        .from('profiles')
        .select('userid, username');

    if (profileError) {
        console.error('Error fetching employee profiles:', profileError);
        alert(
            'An error occurred while fetching employee profiles. Please try again.'
        );
        return;
    }

    const employeeMap = {};

    profiles.forEach((profile) => {
        employeeMap[profile.userid] = profile.username;
    });

    //group data by employee
    const employeeData = {};

    liveData.forEach((row) => {
        const employeeId = row.employee_id;

        if (!employeeData[employeeId]) {
            employeeData[employeeId] = {
                employeeId: employeeId,
                username: employeeMap[employeeId] || 'Unknown Employee',
                sessions: 0,
                hours: 0,
                views: 0,
                itemsSold: 0,
                gmv: 0,
            };
        }

        employeeData[employeeId].sessions++;
        employeeData[employeeId].hours += Number(row.duration_hours) || 0;
        employeeData[employeeId].views += Number(row.views) || 0;
        employeeData[employeeId].itemsSold += Number(row.items_sold) || 0;
        employeeData[employeeId].gmv += Number(row.gmv_amount) || 0;
    });

    // CONVERT TO ARRAY
    const employees = Object.values(employeeData);

    // CALCULATE GMV PER HOUR
    employees.forEach((employee) => {
        employee.gmvPerHour =
            employee.hours > 0 ? employee.gmv / employee.hours : 0;
    });

    //sort by total gmv (descending)
    employees.sort((a, b) => b.gmv - a.gmv);

    console.log('Employee Report Data:', employees);

    //update card
    const totalHours = employees.reduce(
        (sum, employee) => sum + employee.hours,
        0
    );
    const totalitems = employees.reduce(
        (sum, employee) => sum + employee.itemsSold,
        0
    );
    const totalGMV = employees.reduce((sum, employee) => sum + employee.gmv, 0);

    document.getElementById('employeeTotalCount').textContent =
        employees.length;
    document.getElementById('employeeTotalHours').textContent =
        totalHours.toFixed(2);
    document.getElementById('employeeTotalItems').textContent =
        totalitems.toLocaleString();
    document.getElementById('employeeTotalGMV').textContent =
        `RM ${totalGMV.toFixed(2)}`;

    //update table
    const table = document.getElementById('employeeReportTable');

    table.innerHTML = '';

    if (employees.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="7"
                    class="text-center text-muted py-4">

                    No employee data found.

                </td>
            </tr>
        `;

        return;
    }

    employees.forEach((employee, index) => {
        const row = document.createElement('tr');

        row.innerHTML = `
        <td><strong>${index + 1}.${employee.username}</strong></td>
        <td>${employee.sessions}</td>
        <td>${employee.hours.toFixed(2)}</td>
        <td>${employee.views}</td>
        <td>${employee.itemsSold}</td>
        <td>RM ${employee.gmv.toFixed(2)}</td>
        <td>RM ${employee.gmvPerHour.toFixed(2)}</td>
        `;

        table.appendChild(row);
    });
}

//load payout report
async function loadPayoutReport(filter) {
    console.log('Loading Payout Report with filter:', filter);

    let query = supabaseClient
        .from('Payout')
        .select(
            `payout_id,
            employee_id,
            employee_name,
            period_start_date,
            period_end_date,
            total_hours_worked,
            total_items_sold,
            total_gmv,
            base_payment,
            bonus_amount,
            final_payout,
            payout_date`
        )
        .gte('payout_date', filter.startDate)
        .lte('payout_date', filter.endDate)
        .order('payout_date', { ascending: false });

    //employee filter
    if (filter.employeeId && filter.employeeId !== 'all') {
        query = query.eq('employee_id', filter.employeeId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching payout report:', error);
        alert(
            'An error occurred while fetching the payout report. Please try again.'
        );
        return;
    }

    console.log('Payout Report Data:', data);

    // CALCULATE TOTALS
    let totalPayout = 0;
    let totalBasePayment = 0;
    let totalBonus = 0;

    data.forEach((row) => {
        totalPayout += row.final_payout || 0;
        totalBasePayment += row.base_payment || 0;
        totalBonus += row.bonus_amount || 0;
    });

    //update card
    document.getElementById('totalPayout').textContent =
        `RM ${totalPayout.toFixed(2)}`;
    document.getElementById('totalBasePayment').textContent =
        `RM ${totalBasePayment.toFixed(2)}`;
    document.getElementById('totalBonus').textContent =
        `RM ${totalBonus.toFixed(2)}`;

    //update table
    const table = document.getElementById('payoutReportTable');

    table.innerHTML = '';

    if (data.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="11"
                    class="text-center text-muted py-4">
                    No payout data found.
                </td>
            </tr>
        `;
        return;
    }

    data.forEach((row) => {
        const tableRow = document.createElement('tr');

        tableRow.innerHTML = `
            <td>${row.employee_name}</td>
            <td>${formatDateDisplay(row.period_start_date)}-${formatDateDisplay(row.period_end_date)}</td>
            <td>RM ${Number(row.base_payment).toFixed(2)}</td>
            <td>RM ${Number(row.bonus_amount).toFixed(2)}</td>
            <td>RM ${Number(row.final_payout).toFixed(2)}</td>
        `;

        table.appendChild(tableRow);
    });
}

//load inventory report
async function loadInventoryReport(filter) {
    console.log('Loading Inventory Report with filter:', filter);

    const { data, error } = await supabaseClient
        .from('Product')
        .select(`Product_name,Stock`)
        .order('Stock', { ascending: true });

    if (error) {
        console.error('Error fetching inventory report:', error);
        alert(
            'An error occurred while fetching the inventory report. Please try again.'
        );
        return;
    }

    console.log('Inventory Report Data:', data);

    const totalProducts = data.length;
    let totalStock = 0;
    let lowstock = 0;
    let outofstock = 0;

    data.forEach((row) => {
        const stock = Number(row.Stock) || 0;

        totalStock += stock;

        if (stock == 0) {
            outofstock++;
        } else if (stock <= 10) {
            lowstock++;
        }
    });

    //update card
    document.getElementById('totalProducts').textContent =
        totalProducts.toLocaleString();
    document.getElementById('totalStock').textContent =
        totalStock.toLocaleString();
    document.getElementById('lowStock').textContent = lowstock;
    document.getElementById('outOfStock').textContent = outofstock;

    //update table
    const table = document.getElementById('inventoryReportTable');
    table.innerHTML = '';

    if (data.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="3"
                    class="text-center text-muted py-4">
                    No inventory data found.
                </td>
            </tr>
        `;
        return;
    }

    data.forEach((product) => {
        const stock = Number(product.Stock) || 0;

        let status;
        let badge;

        if (stock == 0) {
            status = 'Out of Stock';
            badge = 'danger';
        } else if (stock <= 10) {
            status = 'Low Stock';
            badge = 'warning';
        } else {
            status = 'In Stock';
            badge = 'success';
        }

        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${product.Product_name}</td>
            <td>${stock.toLocaleString()}</td>
            <td><span class="badge bg-${badge}">${status}</span></td>
        `;

        table.appendChild(row);
    });
}

//load live views report
async function loadLiveViewsReport(filter) {
    console.log('Loading Live Views Report with filter:', filter);

    let query = supabaseClient
        .from('Live')
        .select(
            `session_date, employee_id, views,day_of_week,gmv_amount,start_time`
        )
        .gte('session_date', filter.startDate)
        .lte('session_date', filter.endDate)
        .order('session_date', { ascending: true });

    //employee filter
    if (filter.employeeId && filter.employeeId !== 'all') {
        query = query.eq('employee_id', filter.employeeId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching live views report:', error);
        alert(
            'An error occurred while fetching the live views report. Please try again.'
        );
        return;
    }

    console.log('Live Views Report Data:', data);

    // CALCULATE SUMMARY
    let totalViews = 0;

    data.forEach((row) => {
        totalViews += row.views || 0;
    });

    const totalSessions = data.length;
    const averageViews = totalSessions > 0 ? totalViews / totalSessions : 0;
    const peakviews = data.reduce(
        (max, row) => Math.max(max, row.views || 0),
        0
    );
    //update card
    document.getElementById('totalViews').textContent =
        totalViews.toLocaleString();
    document.getElementById('totalLiveSessions').textContent =
        totalSessions.toLocaleString();
    document.getElementById('averageViews').textContent =
        averageViews.toFixed(2);
    document.getElementById('peakViews').textContent =
        peakviews.toLocaleString();

    //load chart
    loadliveViewsTrendChart(data);
    loadliveDayOfWeekChart(data);
    loadliveStartTimeChart(data);
}

//live views trend chart
let liveViewsTrendChart = null;

function loadliveViewsTrendChart(data) {
    const canva = document
        .getElementById('liveViewsTrendChart')
        .getContext('2d');

    if (!canva) {
        console.error('Canvas element for live views trend chart not found.');
        return;
    }

    if (liveViewsTrendChart) {
        liveViewsTrendChart.destroy();
    }

    //group views by date
    const dailyViews = {};

    data.forEach((row) => {
        const date = row.session_date;
        if (!dailyViews[date]) {
            dailyViews[date] = 0;
        }
        dailyViews[date] += row.views || 0;
    });

    const labels = Object.keys(dailyViews);
    const views = labels.map((date) => dailyViews[date]);

    liveViewsTrendChart = new Chart(canva, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Views',
                    data: views,
                    tension: 0.3,
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Views',
                    },
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date',
                    },
                },
            },
            plugins: {
                legend: {
                    position: 'top',
                },
            },
        },
    });
}

//liveDayOfWeekChart
let liveDayOfWeekChart = null;

function loadliveDayOfWeekChart(data) {
    const canva = document
        .getElementById('liveDayOfWeekChart')
        .getContext('2d');

    if (!canva) {
        console.error('Canvas element for live day of week chart not found.');
        return;
    }

    if (liveDayOfWeekChart) {
        liveDayOfWeekChart.destroy();
    }

    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const dayDates = {};

    dayOrder.forEach((day) => {
        dayDates[day] = {
            views: 0,
            gmv: 0,
        };
    });

    data.forEach((row) => {
        const day = row.day_of_week;

        //ignore if day is not valid
        if (!dayDates[day]) {
            console.warn(`Invalid day of week: ${day}`);
            return;
        }
        dayDates[day].views += Number(row.views) || 0;
        dayDates[day].gmv += Number(row.gmv_amount) || 0;
    });

    const views = dayOrder.map((day) => dayDates[day].views);
    const gmv = dayOrder.map((day) => dayDates[day].gmv);

    liveDayOfWeekChart = new Chart(canva, {
        type: 'bar',
        data: {
            labels: dayOrder,
            datasets: [
                {
                    label: 'Views',
                    data: views,
                },
                {
                    label: 'GMV',
                    data: gmv,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
            plugins: {
                legend: {
                    position: 'top',
                },
            },
        },
    });
}

// liveStartTimeChart
let liveStartTimeChart = null;

function loadliveStartTimeChart(data) {
    const canvasElement = document.getElementById('liveStartTimeChart');

    if (!canvasElement) {
        console.error('Canvas element for live start time chart not found.');
        return;
    }

    const canvas = canvasElement.getContext('2d');

    if (!canvas) {
        console.error('Unable to get canvas context.');
        return;
    }

    // Destroy previous chart
    if (liveStartTimeChart) {
        liveStartTimeChart.destroy();
    }

    // Create all 24 hours
    const timeData = {};

    for (let hour = 0; hour < 24; hour++) {
        const hourString = String(hour).padStart(2, '0');

        timeData[hourString] = {
            views: 0,
            gmv: 0,
        };
    }

    // Add database data
    data.forEach((row) => {
        if (!row.start_time) {
            console.warn('Missing start time for row:', row);
            return;
        }

        // Get hour from start_time
        // Example: "14:30:00" -> "14"
        const hour = row.start_time.substring(0, 2);

        // Make sure the hour is valid
        if (!timeData[hour]) {
            return;
        }

        timeData[hour].views += Number(row.views) || 0;
        timeData[hour].gmv += Number(row.gmv_amount) || 0;
    });

    // Always 00 to 23
    const labels = [];

    for (let hour = 0; hour < 24; hour++) {
        labels.push(String(hour).padStart(2, '0') + ':00');
    }

    const views = labels.map((label) => {
        const hour = label.substring(0, 2);
        return timeData[hour].views;
    });

    const gmv = labels.map((label) => {
        const hour = label.substring(0, 2);
        return timeData[hour].gmv;
    });

    liveStartTimeChart = new Chart(canvas, {
        type: 'bar',

        data: {
            labels: labels,

            datasets: [
                {
                    label: 'Views',
                    data: views,
                },
                {
                    label: 'GMV',
                    data: gmv,
                },
            ],
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Live Start Time',
                    },
                },

                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Amount',
                    },
                },
            },

            plugins: {
                legend: {
                    position: 'top',
                },
            },
        },
    });
}

//filter handle
document.addEventListener('DOMContentLoaded', async () => {
    const periodFilter = document.getElementById('periodFilter');
    const employeeFilter = document.getElementById('employeeFilter');
    const reportTypeFilter = document.getElementById('reportTypeFilter');

    const salesSection = document.getElementById('salesSection');
    const employeeSection = document.getElementById('employeeSection');
    const payoutSection = document.getElementById('payoutSection');
    const inventorySection = document.getElementById('inventorySection');
    const liveViewsSection = document.getElementById('liveViewsSection');

    const customDateRange = document.getElementById('customDateRange');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    const applyFilterBtn = document.getElementById('applyFilterBtn');

    updateReportSections();
    await loadEmployees();

    periodFilter.addEventListener('change', () => {
        if (periodFilter.value === 'custom') {
            customDateRange.classList.remove('d-none');
        } else {
            customDateRange.classList.add('d-none');
        }
    });

    reportTypeFilter.addEventListener('change', () => {
        updateReportSections();
    });

    applyFilterBtn.addEventListener('click', async () => {
        const filter = getReportFilter();

        if (!filter) {
            return;
        }
        console.log('Report Filter:', filter);

        await loadReport(filter);
    });

    const defaultFilter = getReportFilter();
    if (defaultFilter) {
        await loadReport(defaultFilter);
    }

    //load employee select options
    async function loadEmployees() {
        const { data, error } = await fetchStaffProfiles();

        if (error) {
            console.error('Error fetching employees:', error);
            alert(
                'An error occurred while fetching employees. Please try again.'
            );
            return;
        }

        const sorted = [...data].sort((a, b) =>
            (a.username || '').localeCompare(b.username || '')
        );

        employeeFilter.innerHTML = '<option value="all">All Staff</option>';

        sorted.forEach((employee) => {
            const option = document.createElement('option');
            option.value = employee.userid;
            option.textContent = employee.username;
            employeeFilter.appendChild(option);
        });
    }

    function updateReportSections() {
        const reportType = reportTypeFilter.value;

        // Hide all sections first
        salesSection.classList.add('d-none');
        liveViewsSection.classList.add('d-none');
        employeeSection.classList.add('d-none');
        payoutSection.classList.add('d-none');
        inventorySection.classList.add('d-none');

        //all
        if (reportType === 'all') {
            salesSection.classList.remove('d-none');
            liveViewsSection.classList.remove('d-none');
            employeeSection.classList.remove('d-none');
            payoutSection.classList.remove('d-none');
            inventorySection.classList.remove('d-none');
        }

        //sales
        else if (reportType === 'sales') {
            salesSection.classList.remove('d-none');
        }

        //live views
        else if (reportType === 'live') {
            liveViewsSection.classList.remove('d-none');
        }

        //employee
        else if (reportType === 'employee') {
            employeeSection.classList.remove('d-none');
        }

        //payout
        else if (reportType === 'payout') {
            payoutSection.classList.remove('d-none');
        }

        //inventory
        else if (reportType === 'inventory') {
            inventorySection.classList.remove('d-none');
        }
    }

    function getReportFilter() {
        let start;
        let end;

        const period = periodFilter.value;

        //custom date range
        if (period === 'custom') {
            start = startDate.value;
            end = endDate.value;

            if (!start || !end) {
                alert(
                    'Please select both start and end dates for custom range.'
                );
                return null;
            }

            if (new Date(start) > new Date(end)) {
                alert('Start date cannot be after end date.');
                return null;
            }
        }

        //this month
        else if (period === 'this_month') {
            const now = new Date();

            start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
            end = formatDate(
                new Date(now.getFullYear(), now.getMonth() + 1, 0)
            );
        }

        //last month
        else if (period === 'last_month') {
            const now = new Date();

            start = formatDate(
                new Date(now.getFullYear(), now.getMonth() - 1, 1)
            );
            end = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
        }

        //this week
        else if (period === 'this_week') {
            const now = new Date();

            const day = now.getDay(); // 0 (Sun) to 6 (Sat)
            const diffToMonday = day === 0 ? -6 : day - 1; // If Sunday, go back 6 days, else go back to Monday
            const weekStart = new Date(now);

            weekStart.setDate(now.getDate() - diffToMonday);

            start = formatDate(weekStart);
            end = formatDate(now);
        }

        //this year
        else if (period === 'this_year') {
            const now = new Date();

            start = formatDate(new Date(now.getFullYear(), 0, 1));
            end = formatDate(new Date(now.getFullYear(), 11, 31));
        }

        return {
            startDate: start,
            endDate: end,
            employeeId: employeeFilter.value,
            reportType: reportTypeFilter.value,
        };
    }

    async function loadReport(filter) {
        const reportType = filter.reportType;

        try {
            //all
            if (reportType === 'all') {
                await Promise.all([
                    loadSalesReport(filter),
                    loadLiveViewsReport(filter),
                    loadEmployeeReport(filter),
                    loadPayoutReport(filter),
                    loadInventoryReport(filter),
                ]);
            }

            //sales
            else if (reportType === 'sales') {
                await loadSalesReport(filter);
            }

            //live views
            else if (reportType === 'live') {
                await loadLiveViewsReport(filter);
            }

            //employee
            else if (reportType === 'employee') {
                await loadEmployeeReport(filter);
            }

            //payout
            else if (reportType === 'payout') {
                await loadPayoutReport(filter);
            }

            //inventory
            else if (reportType === 'inventory') {
                await loadInventoryReport(filter);
            }
        } catch (error) {
            console.error('Error loading report:', error);
            alert(
                'An error occurred while loading the report. Please try again.'
            );
        }
    }

    function formatDate(date) {
        const year = date.getFullYear();

        const month = String(date.getMonth() + 1).padStart(2, '0');

        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }
});

function formatDateDisplay(dateString) {
    if (!dateString) {
        return '-';
    }

    const date = new Date(dateString);

    return date.toLocaleDateString('en-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

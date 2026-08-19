let stockChart;
/*async function loadMonthlyGMV() {
    const now = new Date();

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastmonthLabel = startOfLastMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    document.getElementById('monthly-gmv-label').textContent = `GMV amount (${lastmonthLabel})`;

    const { data,error } = await supabaseClient
        .from('Live')
        .select('gmv_amount')
        .gte('session_date',startOfLastMonth.toISOString())
        .lte('session_date',endOfLastMonth.toISOString());

    if (error) {
        console.error('Error fetching monthly GMV:', error);
        return;
    }

    const totalGMV = data.reduce((sum, record) => sum + Number(record.gmv_amount||0), 0);

    document.getElementById('monthly-gmv').textContent = `RM${totalGMV.toFixed(2)}`;
}

async function loadMonthlyItemsSold() {
    const now = new Date();

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastmonthLabel = startOfLastMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    document.getElementById('monthly-item-sold-label').textContent = `Items Sold (${lastmonthLabel})`;

    const { data,error } = await supabaseClient
        .from('Live')
        .select('items_sold')
        .gte('session_date',startOfLastMonth.toISOString())
        .lte('session_date',endOfLastMonth.toISOString());

    if (error) {
        console.error('Error fetching monthly items sold:', error);
        return;
    }

    const totalItemsSold = data.reduce((sum, record) => sum + Number(record.items_sold||0), 0);

    document.getElementById('monthly-item-sold').textContent = `${totalItemsSold}`;
}*/
async function loaddailyGMV() {
    const now = new Date();
    const { data,error } = await supabaseClient
        .from('Live')
        .select('gmv_amount')
        .eq('session_date',now.toISOString().split('T')[0]);

    if (error) {
        console.error('Error fetching daily GMV:', error);
        return;
    }

    const totalGMV = data.reduce((sum, record) => sum + Number(record.gmv_amount||0), 0);

    document.getElementById('daily-gmv').textContent = `RM${totalGMV.toFixed(2)}`;
}

async function loaddailyItemsSold() {
    const now = new Date();
    const { data,error } = await supabaseClient
        .from('Live')
        .select('items_sold')
        .eq('session_date',now.toISOString().split('T')[0]);

    if (error) {
        console.error('Error fetching daily items sold:', error);
        return;
    }

    const totalItemsSold = data.reduce((sum, record) => sum + Number(record.items_sold||0), 0);

    document.getElementById('daily-item-sold').textContent = `${totalItemsSold}`;
}

async function loadActiveStaff() {
    const { data,error } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('role','employee');

    if (error) {
        console.error('Error fetching active staff:', error);
        return;
    }
    else{
        const activeStaffCount = data.length;
        document.getElementById('active_staff').textContent = `${activeStaffCount}`;
    }
}

async function loadViews() {
    const now = new Date();
    const { data,error } = await supabaseClient
        .from('Live')
        .select('views')
        .eq('session_date',now.toISOString().split('T')[0]);

    if (error) {
        console.error('Error fetching views:', error);
        return;
    }

    const totalViews = data.reduce((sum, record) => sum + Number(record.views||0), 0);
    document.getElementById('views').textContent = `${totalViews}`;
}

async function loadstock(){
    const { data,error } = await supabaseClient
        .from('Product')
        .select('Stock')

    if (error) {
        console.error('Error fetching stock:', error);
        return;
    }

    const totalStock = data.reduce((sum, record) => sum + Number(record.Stock||0), 0);
    const lowStockCount = data.filter(record => Number(record.Stock||0) < 10 && Number(record.Stock||0) > 0).length;
    const outOfStockCount = data.filter(record => Number(record.Stock||0) === 0).length;

    document.getElementById('low-stock').textContent = `${lowStockCount}`;
    document.getElementById('out-of-stock').textContent = `${outOfStockCount}`;
    document.getElementById('total-stock').textContent = `${totalStock}`;
}

async function loadTopEmployees() {
    const date = new Date();
    const month = date.getMonth() + 1; // Months are zero-based
    const year = date.getFullYear();

    const { data, error } = await supabaseClient
        .from('employee_gmv_summary')
        .select('employee_id, total_gmv')
        .gte(
            'session_date',
            `${year}-${month.toString().padStart(2, '0')}-01`
        )
        .lt(
            'session_date',
            `${year}-${(month + 1).toString().padStart(2, '0')}-01`
        );

    if (error) {
        console.error('Error fetching top employees:', error);
        return;
    }
    const employeeTotals = {};

    data.forEach(record => {
        const employeeId = record.employee_id;
        const gmv = Number(record.total_gmv) || 0;

        if (!employeeTotals[employeeId]) {
            employeeTotals[employeeId] = 0;
        }

        employeeTotals[employeeId] += gmv;
    });

    const topEmployeesData = Object.entries(employeeTotals)
    .map(([employee_id, total_gmv]) => ({
        employee_id,
        total_gmv
    }))
    .sort((a, b) => b.total_gmv - a.total_gmv)
    .slice(0, 5);

    const {data:profile,error:profileError}=await supabaseClient
        .from('profiles')
        .select('userid, username')
        .in('userid', topEmployeesData.map(record => record.employee_id));
    
    const profileMap = {};
    if (profileError) {
        console.error('Error fetching employee profiles:', profileError);
        return;
    }
    profile.forEach(record => {
        profileMap[record.userid] = record.username;
    });
    // Update the employee names in the UI
    const topEmployees = topEmployeesData.map(record => profileMap[record.employee_id] || 'N/A');
    document.getElementById('top-employee').textContent = topEmployees[0]|| 'N/A';
    document.getElementById('second-employee').textContent = topEmployees[1] || 'N/A';
    document.getElementById('third-employee').textContent = topEmployees[2] || 'N/A';
    document.getElementById('fourth-employee').textContent = topEmployees[3] || 'N/A';
    document.getElementById('fifth-employee').textContent = topEmployees[4] || 'N/A';
}

async function loadRecentPayouts() {
    const { data, error } = await supabaseClient
        .from('Payout')
        .select('payout_id, final_payout, payout_date, employee_id')
        .order('payout_date', { ascending: false })
        .limit(5);
    
    if (error) {
        console.error('Error fetching recent payouts:', error);
        return;
    }

    const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('userid, username')
        .in('userid', data.map(record => record.employee_id));
    
    if (profileError) {
        console.error('Error fetching employee profiles:', profileError);
        return;
    }

    const profileMap = {};
    profileData.forEach(record => {
        profileMap[record.userid] = record.username;
    });

    const recentPayoutsBody = document.getElementById('recent-payouts');
    recentPayoutsBody.innerHTML = '';

    data.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.payout_id}</td>
            <td>${profileMap[record.employee_id] || 'N/A'}</td>
            <td>RM${Number(record.final_payout).toFixed(2)}</td>
            <td>${new Date(record.payout_date).toLocaleDateString()}</td>
        `;
        recentPayoutsBody.appendChild(row);
    });
}

const formatActivityDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(); // Adjust formatting logic as needed
};

async function loadRecentActivity() {

    const container = document.getElementById("recent-activity");

    if (!container) {
        console.error("recent-activity element not found");
        return;
    }

    container.innerHTML = `
        <div class="text-muted text-center">
            Loading...
        </div>
    `;

    // LOAD RECENT LIVE SESSIONS
    const { data: liveData, error: liveError } =
        await supabaseClient
            .from("Live")
            .select("session_date, items_sold, gmv_amount")
            .order("session_date", { ascending: false })
            .limit(5);

    if (liveError) {
        console.error("Error loading Live:", liveError);
    }

    // LOAD RECENT PAYOUTS
    const { data: payoutData, error: payoutError } =
        await supabaseClient
            .from("Payout")
            .select("employee_name, payout_date, final_payout")
            .order("payout_date", { ascending: false })
            .limit(5);

    if (payoutError) {
        console.error("Error loading Payout:", payoutError);
    }


    // COMBINE ACTIVITIES
    const activities = [];


    // LIVE ACTIVITIES
    if (liveData) {

        liveData.forEach(record => {

            activities.push({

                type: "live",

                date: new Date(record.session_date),

                title: "Live Session",

                description:
                    `${record.items_sold || 0} items sold • RM${Number(record.gmv_amount || 0).toFixed(2)} GMV`

            });

        });

    }

    // PAYOUT ACTIVITIES
    if (payoutData) {

        payoutData.forEach(record => {

            activities.push({

                type: "payout",

                date: new Date(record.payout_date),

                title:
                    `Payout for ${record.employee_name}`,

                description:
                    `RM${Number(record.final_payout || 0).toFixed(2)}`

            });

        });

    }


    // SORT NEWEST → OLDEST
    activities.sort((a, b) => {

        return b.date - a.date;

    });

    // ONLY SHOW 5
    const recentActivities = activities.slice(0, 5);

    // NO DATA
    if (recentActivities.length === 0) {

        container.innerHTML = `
            <div class="text-muted text-center py-3">
                No recent activity
            </div>
        `;

        return;
    }


    // DISPLAY
    container.innerHTML = recentActivities.map(activity => {

        let icon;
        let iconClass;

        if (activity.type === "live") {

            icon = "bi-broadcast";
            iconClass = "text-success";

        } else {

            icon = "bi-cash-stack";
            iconClass = "text-primary";

        }


        return `
            <div class="d-flex align-items-start mb-3">

                <div
                    class="me-3 d-flex align-items-center justify-content-center"
                    style="
                        width: 38px;
                        height: 38px;
                        border-radius: 50%;
                        background: #f8f9fa;
                    "
                >

                    <i
                        class="bi ${icon} ${iconClass}"
                        style="font-size: 18px;"
                    ></i>

                </div>


                <div class="flex-grow-1">

                    <div class="fw-semibold">
                        ${activity.title}
                    </div>

                    <div class="text-muted small">
                        ${activity.description}
                    </div>

                    <div class="text-muted small mt-1">
                        ${formatActivityDate(activity.date)}
                    </div>

                </div>

            </div>
        `;

    }).join("");
}

async function loadStockChart() {
    const { data,error } = await supabaseClient
        .from('Product')
        .select('Product_name, Stock')
        .order('Stock', { ascending: true })
        .limit(10);

    if (error) {
        console.error('Error fetching stock data for chart:', error);
        return;
    }
    const productNames = data.map(record => record.Product_name);
    const stockValues = data.map(record => Number(record.Stock||0));

    const canvas = document.getElementById('stockChart');

    if (stockChart) {
        stockChart.destroy();
    }
    
    stockChart = new Chart(canvas, {
        type: 'bar',
        data:{
            labels: productNames,
            datasets: [{
                label: 'Stock',
                data: stockValues,
                backgroundColor: stockValues.map(stock => {
                        if (stock <= 10) {
                            return "#dc3545"; // Red
                        }
                        if (stock <= 30) {
                            return "#fd7e14"; // Orange
                        }
                        if (stock <= 50) {
                            return "#ffc107"; // Yellow
                        }
                        return "#198754"; // Green
                })
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,   
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Stock'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Product Name'
                        }
                    }
                }
            }
    });
}
    document.addEventListener('DOMContentLoaded', () => {
        loaddailyGMV();
        loaddailyItemsSold();
        loadActiveStaff();
        loadViews();
        loadstock();
        loadStockChart();
        loadTopEmployees();
        loadRecentPayouts();
        loadRecentActivity();
});
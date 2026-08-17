let salesChart=null;
let workingHours=null;
let liveViewsTrend=null;

async function loadcharts(){

    const {data:sessionData,error:sessionError}=await supabaseClient.auth.getSession();

    if(sessionError || !sessionData || !sessionData.session) {
        console.error("Error fetching session:", sessionError);
        alert("Error fetching session. Please check the console for details.");
        return;
    }

    const session = sessionData?.session;

    if(!session){
        console.error("No active session found.");
        return;
    }

    const user=session.user;
    
    if(!user || !user.email){
        console.error("User email not found in session.");
        return;
    }

    const {data:profile,error:profileError}=await supabaseClient
        .from("profiles")
        .select("userid")
        .eq("email",user.email)
        .single();

    if (profileError) {
        console.error("Profile error:", profileError);
        return;
    }

    if (!profile || profile.length === 0) {
        console.error("Employee profile not found.");
        return;
    }

    const employeeId = profile.userid;

    const now = new Date();

    

    const startDate=new Date(
        now.getFullYear(),
        now.getMonth()-1,
        1
    );

    const endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
    );

    const start=formatChartDate(startDate);
    const end = formatChartDate(endDate);

    const lastmonthLabel = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    document.getElementById('sales_title').innerHTML =`Sales Performance (${lastmonthLabel})`;
    document.getElementById('working_title').innerHTML =`Working hours (${lastmonthLabel})`;
    document.getElementById('views_title').innerHTML =`Live views trend (${lastmonthLabel})`;

    const {data:liveData,error:liveError}=await supabaseClient
        .from('Live')
        .select( 'employee_id,session_date,duration_hours,items_sold,gmv_amount,views')
        .eq('employee_id', employeeId)
        .gte('session_date', start)
        .lt('session_date', end)
        .order('session_date', {ascending: true});    
            
    if(liveError){
        console.error("Live data error:", liveError);
        return;
    }

    createSalesPerformanceChart(liveData);
    createWorkingHoursChart(liveData);
    createliveViewsTrendChart(liveData);
}

function createSalesPerformanceChart(data){

    const dailysales=[];

    data.forEach((record)=>{

        const date = record.session_date;

        if (!dailysales[date]) {
            dailysales[date] = 0;
        }

        dailysales[date] += Number(record.gmv_amount) || 0;
    });

    const labels = Object.keys(dailysales);
    const values = Object.values(dailysales);

    const canvas = document.getElementById('salesChart');

    if(!canvas){
        console.error("Sales chart canvas not found.");
        return;
    }

    if(salesChart){
        salesChart.destroy();
    }

    salesChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sales',
                data: values,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.4,
                fill: true,
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'RM'+ Number(context.raw)
                            .toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date',
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: 'Sales (RM)',
                    },
                    beginAtZero: true,
                },
            },
        }
    });
}

function createWorkingHoursChart(data){
    const dailyHours={};

    data.forEach((record)=>{
        const date = record.session_date;

        if (!dailyHours[date]) {
            dailyHours[date] = 0;
        }

        dailyHours[date] += Number(record.duration_hours) || 0;
    });

    const labels = Object.keys(dailyHours);
    const values = Object.values(dailyHours);

    const canvas = document.getElementById('workingHours');

    if(!canvas){
        console.error("Working hours chart canvas not found.");
        return;
    }

    if(workingHours){
        workingHours.destroy();
    }

    workingHoursChart = new Chart(canvas, {

        type: 'bar',

        data: {

            labels: labels,

            datasets: [{
                label: 'Working Hours',
                data: values,
                borderWidth: 1
            }]

        },


        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {
                y: {

                    beginAtZero: true,

                    title: {
                        display: true,
                        text: 'Hours'
                    }
                },
                x: {

                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });

}


function createliveViewsTrendChart(data){
    const dailyViews={};

    data.forEach((record)=>{
        const date = record.session_date;

        if (!dailyViews[date]) {
            dailyViews[date] = 0;
        }

        dailyViews[date] += Number(record.views) || 0;
    });

    const labels = Object.keys(dailyViews);
    const values = Object.values(dailyViews);

    const canvas = document.getElementById('liveViewsTrend');

    if(!canvas){
        console.error("Live views trend chart canvas not found.");
        return;
    }

    if(liveViewsTrend){
        liveViewsTrend.destroy();
    }

    liveViewsChart = new Chart(canvas, {

        type: 'line',

        data: {
            labels: labels,

            datasets: [{
                label: 'Live Views',
                data: values,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.3,
                fill: true,
                borderWidth: 2
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return Number(context.raw).toLocaleString('en-MY') + ' views';
                        }
                    }

                }

            },

            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Views'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });

}

function formatChartDate(date) {

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', () => {
    loadcharts();
});
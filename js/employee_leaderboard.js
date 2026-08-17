let leaderboardData = [];

async function loadLeaderboard() {

    console.log("=== LEADERBOARD START ===");

    showLeaderboardLoading();

    const {data: sessionData,error: sessionError} = await supabaseClient.auth.getSession();

    if (sessionError) {

        console.error("Error fetching session:",sessionError);

        showLeaderboardError("Unable to get your login session.");
        
        return;
    }


    const session = sessionData?.session;


    if (!session) {

        console.error("No active session.");

        showLeaderboardError("You are not logged in.");

        return;
    }


    const user = session.user;


    if (!user || !user.email) {

        showLeaderboardError("Unable to get your account information.");

        return;
    }

    const {data: currentProfile,error: currentProfileError} = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .limit(1);


    if (currentProfileError) {

        console.error("Profile error:",currentProfileError);

        showLeaderboardError("Unable to load employee profile.");

        return;
    }


    if (!currentProfile ||currentProfile.length === 0) {

        showLeaderboardError("Employee profile was not found.");

        return;
    }


    const currentEmployeeId =currentProfile[0].userid;


    const period =document.getElementById('leaderboardPeriod').value;


    const {startDate,endDate} = getDateRange(period);

    const {data: liveData,error: liveError} = await supabaseClient
        .from('Live')
        .select(`employee_id,items_sold,gmv_amount,session_date`)
        .gte('session_date',startDate)
        .lt('session_date',endDate);


    if (liveError) {

        console.error("Live data error:",liveError);

        showLeaderboardError("Unable to load sales data.");

        return;
    }


    const {data: profiles,error: profilesError} = await supabaseClient
        .from('profiles')
        .select('*');


    if (profilesError) {

        console.error("Profiles error:",profilesError);

        showLeaderboardError("Unable to load employee information.");

        return;
    }

    const employeeMap = {};


    profiles.forEach(profile => {
        employeeMap[profile.userid] = profile;
    });

    const employeeTotals = {};

    liveData.forEach(record => {
        const employeeId =record.employee_id;

        if (!employeeTotals[employeeId]) {
                
            employeeTotals[employeeId] = {

            employeeId: employeeId,
            totalGMV: 0,
            totalItems: 0
            };
        }


        employeeTotals[employeeId].totalGMV +=Number(record.gmv_amount) || 0;

        employeeTotals[employeeId].totalItems +=Number(record.items_sold) || 0;

    });

    leaderboardData =Object.values(employeeTotals);

    leaderboardData.forEach(employee => {

        const profile =employeeMap[employee.employeeId];


        employee.name =getEmployeeName(profile);


        employee.isCurrentUser = (employee.employeeId ===currentEmployeeId);

    });

    leaderboardData.sort((a, b) =>
        b.totalGMV - a.totalGMV
    );

    leaderboardData.forEach(
        (employee, index) => {
            employee.rank = index + 1;
    });

    

    hideLeaderboardLoading();

    if (leaderboardData.length === 0) {

        showLeaderboardEmpty();

        return;
    }


    displayPodium(leaderboardData);


    displayFullRanking(leaderboardData);

    displayCurrentEmployeeRank();

}

function getDateRange(period) {

    const now = new Date();


    let start;
    let end;


    if (period === 'month') {

        // First day of current month
        start = new Date(now.getFullYear(),now.getMonth(),1);

        // First day of next month

        end = new Date(now.getFullYear(),now.getMonth() + 1,1);
    }


    else if (period === 'lastMonth') {

        start = new Date(now.getFullYear(),now.getMonth() - 1,1);

        end = new Date(now.getFullYear(),now.getMonth(),1);
    }


    else if (period === 'year') {

        start = new Date(now.getFullYear(),0,1);

        end = new Date(now.getFullYear() + 1,0,1);
    }


    return {
        startDate:
            formatDate(start),
        endDate:
            formatDate(end)

    };

}

function formatDate(date) {

    const year =date.getFullYear();


    const month =String(date.getMonth() + 1).padStart(2, '0');

    const day =String(date.getDate()).padStart(2, '0');


    return `${year}-${month}-${day}`;

}

function getEmployeeName(profile) {

    if (!profile) {

        return "Unknown Employee";

    }

    return (
        profile.username ||
        profile.email ||
        "Unknown Employee"
    );

}

function displayPodium(data) {

    const podium =document.getElementById('podium');

    if (!podium) {
        return;
    }


    podium.classList.remove('d-none');

    const players =podium.querySelectorAll('.podium-player');

    players.forEach(player => {

        player.style.animation = 'none';
        player.style.visibility = 'visible';

        void player.offsetWidth;

        // Re-apply class animation so players fade/slide in instead of staying transparent.
        player.style.animation = '';

    });

    //first
    if (data[0]) {
        setPlayer('first',data[0]);
    }

    //second
    if (data[1]) {
        setPlayer('second',data[1]);
    }
    else {
        hidePlayer('second');
    }

    // Third
    if (data[2]) {
        setPlayer('third',data[2]);
    }
    else {
        hidePlayer('third');
    }

}


function setPlayer(position,employee) {

    const name =document.getElementById(`${position}Name`);

    const gmv =document.getElementById(`${position}GMV`);

    const avatar =document.getElementById(`${position}Avatar`);

    const player =document.querySelector(`.${position}-place`);
    

    if (player) {
        player.style.visibility ='visible';
    }

    name.textContent = employee.name;


    gmv.textContent =formatCurrency(employee.totalGMV);

    avatar.textContent =getInitials(employee.name);
}

// HIDE PODIUM PLAYER
function hidePlayer(position) {

    const player =document.querySelector(`.${position}-place`);

    if (player) {
        player.style.visibility ='hidden';
    }

}


function displayFullRanking(data) {

    const container =document.getElementById('leaderboardList');

    const rows =document.getElementById('rankingRows');

    container.classList.remove('d-none');

    rows.innerHTML = "";

    data.forEach(employee => {

        const row =document.createElement('div');

        row.className ='ranking-row';

        if (employee.isCurrentUser) {
                row.classList.add(
                'current-user'
            );

        }


        const medal =getRankDisplay(employee.rank);


        row.innerHTML = `

            <div class="ranking-position">
                ${medal}
            </div>

            <div class="ranking-avatar">
                ${getInitials(employee.name)}
            </div>

            <div class="ranking-info">

                <div class="ranking-name">
                    ${escapeHTML(employee.name)}

                    ${
                        employee.isCurrentUser
                        ? '<span class="badge bg-primary ms-2">You</span>'
                        : ''
                    }

                </div>

                <div class="ranking-items">
                    ${employee.totalItems} items sold
                </div>

            </div>

            <div class="ranking-gmv">
                ${formatCurrency(employee.totalGMV)}
            </div>

        `;


        rows.appendChild(row);

    });

}


function getRankDisplay(rank) {

    if (rank === 1) {

        return "🥇";

    }

    if (rank === 2) {

        return "🥈";

    }

    if (rank === 3) {

        return "🥉";

    }

    return `#${rank}`;

}

// GET INITIALS
function getInitials(name) {

    if (!name) {
        return "?";
    }

    const parts =name.trim().split(/\s+/);


    if (parts.length === 1) {
        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }


    return (parts[0][0] +parts[parts.length - 1][0]).toUpperCase();
}

function formatCurrency(amount) {

    return new Intl.NumberFormat('en-MY',
        {
            style: 'currency',
            currency: 'MYR'
        }
    ).format(amount);

}

function escapeHTML(value) {

    const div =document.createElement(
            'div'
        );

    div.textContent = value;

    return div.innerHTML;

}

function showLeaderboardLoading() {

    document.getElementById('leaderboardLoading')
        .classList.remove('d-none');


    document.getElementById('leaderboardError')
        .classList.add('d-none');


    document.getElementById('podium')
        .classList.add('d-none');


    document.getElementById('leaderboardList')
        .classList.add('d-none');
}

function hideLeaderboardLoading() {

    document.getElementById('leaderboardLoading')
        .classList.add('d-none');

}

function showLeaderboardError(message) {

    hideLeaderboardLoading();

    const error =document.getElementById('leaderboardError');

    error.textContent =message;

    error.classList.remove('d-none');
}

function showLeaderboardEmpty() {

    document.getElementById('leaderboardEmpty')
        .classList.remove('d-none');
}

function displayCurrentEmployeeRank() {

    const currentEmployee = leaderboardData.find(
        employee => employee.isCurrentUser
    );

    if (!currentEmployee) {
        console.log("Current employee is not in leaderboard.");
        return;
    }

    const rankElement = document.getElementById('currentrank');

    if (rankElement) {
        rankElement.textContent = `#${currentEmployee.rank}`;
    }
}

document.addEventListener('DOMContentLoaded',function () {

    const periodSelect =document.getElementById('leaderboardPeriod');
    if(periodSelect) {
        periodSelect.addEventListener('change',loadLeaderboard);
    }
    loadLeaderboard();
});
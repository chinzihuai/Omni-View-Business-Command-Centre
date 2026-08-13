async function loadMonthlyGMV() {
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
}

document.addEventListener('DOMContentLoaded', () => {
    loadMonthlyGMV();
    loadMonthlyItemsSold();
});
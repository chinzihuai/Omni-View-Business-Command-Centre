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
            payout.base_payment ,
            payout.bonus_amount,
            payout.final_payout,
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

addEventListener('DOMContentLoaded', loadPayouts);
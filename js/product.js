let productTable;

async function loadProducts() {

    const{data,error}=await supabaseClient
        .from('Product')
        .select('*');


    if(error) {
        console.error('Error fetching products:', error);
        alert("Error fetching products. Please check the console for details.");
        return;
    }

    // Initialize DataTable only the first time
    if (!productTable) {
        productTable = new DataTable('#ProductTable', {
            pageLength: 10,
            lengthMenu: [10, 25, 50, 100],
            paging: true,
            ordering: true,
            info: true
        });
    }

    //clear all old data before adding new data
    productTable.clear();

    //load new data
    data.forEach(Product => {

    productTable.row.add([
        Product.Product_id,

        Product.Product_name,

        Product.category,

        Product.Stock,

        `
        <button class="btn btn-warning btn-sm"
            onclick="editProduct(this, '${Product.Product_id}')">
            <i class="bi bi-pencil"></i> Edit
        </button>

        <button class="btn btn-danger btn-sm"
            onclick="deleteProduct('${Product.Product_id}')">
            <i class="bi bi-trash"></i> Delete
        </button>
        `
    ]);

});

productTable.draw();
   
    
}

async function deleteProduct(ProductId) {
    if (!confirm("Are you sure you want to delete this product?")) {
        return;
    }

    console.log("Confirm deletion")

    const{error}=await supabaseClient
        .from('Product')
        .delete()
        .eq('Product_id', ProductId);

    if(error) {
        console.error('Error deleting product:', error);
        alert("Failed to delete product.");
        return;
    }

    alert("Product deleted successfully!");

    loadProducts();
}

async function editProduct(button, ProductId) {

    const row = productTable.row(button.closest('tr'));
    const data = row.data();

    if(!row) {
        console.error('Row not found for Product ID:', ProductId);
        return;
    }

    row.data([
        data[0],

        `<input type="text" class="form-control"
                value="${data[1]}">`,

        `<input type="text" class="form-control"
                value="${data[2]}">`,

        `<input type="number" class="form-control"
                value="${data[3]}">`,

        `
        <button class="btn btn-success btn-sm"
            onclick="confirmEdit(this, '${ProductId}')">
            <i class="bi bi-check"></i> Confirm
        </button>

        <button class="btn btn-secondary btn-sm"
            onclick="loadProducts()">
            <i class="bi bi-x"></i> Cancel
        </button>
        `
    ]).draw(false);
}

async function confirmEdit(button, ProductId) {
    const row = productTable.row(button.closest('tr'));
    const inputs = button.closest('tr').querySelectorAll('input');

    const newProductName = inputs[0].value.trim();
    const newCategory = inputs[1].value.trim();
    const newStock = inputs[2].value.trim();

    if (!newProductName || !newCategory || !newStock) {
        alert("All fields are required!");
        return;
    }

    const stock = Number(newStock);

    if (isNaN(stock)) {
        alert("Stock must be a number.");
        return;
    }

    if (stock < 0) {
        alert("Stock cannot be negative.");
        return;
    }

    const { error } = await supabaseClient
        .from('Product')
        .update({
            Product_name: newProductName,
            category: newCategory,
            Stock: stock
        })
        .eq('Product_id', ProductId);

    if (error) {
        console.error("Update error:", error);
        alert("Failed to update product.");
        return;
    }

    alert("Product updated successfully!");

    loadProducts();
}

async function addProduct() {

    const productId =document.getElementById('productId').value.trim();
    const productName =document.getElementById('productName').value.trim();
    const category =document.getElementById('productCategory').value.trim();
    const stockValue =document.getElementById('productStock').value.trim();

    if (!productId || !productName || !category || !stockValue) {
        alert("All fields are required!");
        return;
    }

    if (isNaN(stockValue)) {
        alert("Stock must be a number.");
        return;
    }

    const stock = Number(stockValue);

    if (stock < 0) {
        alert("Stock cannot be negative.");
        return;
    }

    const { error } = await supabaseClient
        .from('Product')
        .insert([{
            Product_id: productId,
            Product_name: productName,
            category: category,
            Stock: stock
        }]);

    if (error) {

        if (error.code === "23505") {
        alert("Product ID already exists. Please use a different ID.");
        } 
        else {
        alert("Failed to add product.");
        }
        console.error("Insert error:", error);
        return;
    }

    alert("Product added successfully!");

    const modalElement = document.getElementById('addProductModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);

    modalInstance.hide();

    loadProducts();
}

async function getNextProductId() {

    const { data, error } = await supabaseClient
        .from('Product')
        .select('Product_id')
        .order('Product_id', { ascending: false })
        .limit(1);

    if (error) {
        console.error("Error getting last Product ID:", error);
        return null;
    }

    // No products yet
    if (data.length === 0) {
        return "Product0001";
    }

    const lastId = data[0].Product_id;

    // Get the number part
    const number = parseInt(lastId.replace("Product", ""), 10);

    // Increase by 1
    const nextNumber = number + 1;

    // Keep 4 digits
    const nextId = String(nextNumber).padStart(4, "0");

    return `Product${nextId}`;
}

document.addEventListener('DOMContentLoaded', function() {

    document.getElementById("addproduct").addEventListener("click", async function() {
        
        const nextId = await getNextProductId();

        if (nextId === null) {
            alert("Unable to generate Product ID.");
            return;
        }

        document.getElementById("productId").value = nextId;

    const productModal = new bootstrap.Modal(document.getElementById('addProductModal'));

    productModal.show();
});;
});


document.addEventListener('DOMContentLoaded', loadProducts);


//sending from client to server side
function addToCart(proId) {
    $.ajax({
        url: '/add-to-cart/' + proId,
        method: 'get',
        success: (response) => {
           swal("Success!", "Item added to cart", "success").then(()=>{
            if (response.status) {
                let count = $('#cart-count').html()
                count = parseInt(count) + 1
                $('#cart-count').html(count)
            }
            location.href = '/cart'
           })
           
        }
    })
}

function addToWishlist(proId) {
    $.ajax({
        url: '/add-to-wishlist/' + proId,
        method: 'get',
        success: (response) => {
            if (response.exist) {
                swal("Info!", "Item already exist in  wishlist", "warning").then(()=>{
                    
                })
            }else if(response.status){
                swal("Success!", "Added to your Wishlist", "success").then(()=>{
                   location.reload()
                })
            }
        }
    })
}

function deleteWishProduct1( proId) {
    console.log("delete from wish");
    swal({
        title: "Are you sure?",
        text: "Product will be removed from wishlist!",
        icon: "warning",
        buttons: true,
        dangerMode: true,
    })
        .then((willDelete) => {
            if (willDelete) {
                $.ajax({
                    url: "/delete-wishlistproduct1",
                    data: {
                       // wishlist: wishlistId,
                        product: proId,
                    },
                    method: "post",
                    success: (response) => {
                        if (response.removed) {
                            //alert("Product Removed from cart")
                            swal("Success!", "Product removed from wishlist", "success").then(() => {
                                location.reload();
                            })

                        }
                    },
                })
            } else {
                //swal("Your imaginary file is safe!");
            }
        });


}










//sending from client to server side
function addToCart(proId) {
    $.ajax({
        url: '/add-to-cart/' + proId,
        method: 'get',
        success: (response) => {
           // alert("Item added to cart")
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
                    
                })
            }
          
        }
    })
}









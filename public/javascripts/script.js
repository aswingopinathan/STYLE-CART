
//sending from client to server side
function addToCart(proId) {
    $.ajax({
        url: '/add-to-cart/' + proId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#cart-count').html()
                count = parseInt(count) + 1
                $('#cart-count').html(count)
            }
        }
    })
}

//ajax for delete cartproduct
// function deleteProduct(cartId, proId) {
//     console.log("delete from cart");
//          $.ajax({
//            url: "/delete-cartproduct",
//            data: {
//              cart: cartId,
//              product: proId,
//            },
//            method: "post",
//            success: (response) => {
//              if (response.removed) {
//                alert("Product Removed from cart");
//                location.reload();
//              }
//            },
//          });
//   }

//ajax of sign up page
// $("#submit-form").submit((e) => {
//     e.preventDefault()
//     if (k == true) {
//         $.ajax({
//             url: "/signup",
//             data: $("#submit-form").serialize(),
//             method: "POST",
//             success: function (response) {
//                 alert("Form submitted")
//                 // window.location.reload()
//                 window.location.href = "/login"
//             },
//             error: function (err) {
//                 alert("Something Error")
//             }
//         })
//     }
// })





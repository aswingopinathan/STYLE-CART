const { response } = require('express');
var express = require('express');
const { TaskRouterGrant } = require('twilio/lib/jwt/AccessToken');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers')
const paypal = require('paypal-rest-sdk');
const CC = require("currency-converter-lt")


const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}

let cartCount;
const verifyCartCount = async (req, res, next) => {
  if (req.session.loggedIn) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
    next()
  } else {
    next() 
  } 
}

/* GET home page. */
let userlog;
router.get('/', async function (req, res, next) {
 try{
  userlog = req.session.user;
  if (req.session.loggedIn) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
    banner = await userHelpers.getBanners()
    productHelpers.getProductList().then((productlist) => {
      res.render('user/index', { userhead: true, userlog, productlist, cartCount ,bannershow:banner})
    })
  } else {
    productHelpers.getProductList().then((productlist) => {
      userHelpers.getBanners().then((banner)=>{
        res.render('user/index', { userhead: true, productlist ,bannershow:banner})
      })
    }) 
  } 
 }catch(err){ 
  console.log(err); 
  res.send("Something went wrong")
 } 
})

let categoryHelper;
router.get('/allproducts', verifyCartCount, function (req, res, next) {
  productHelpers.getProductList().then((productlist) => {
    userHelpers.getAllCategory().then((mycategory)=>{
      categoryHelper=mycategory
      if(req.session.loggedIn){
        res.render('user/category-wise', { userhead: true, userlog, productlist, cartCount,mycategory:categoryHelper })
      }else{
        res.render('user/category-wise', { userhead: true, userlog, productlist,mycategory:categoryHelper })
      }
      
    })
    
  })
})

router.get('/login', (req, res, next) => {
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    res.render('user/login', { loginerr: req.session.loginErr })
    req.session.loginErr = false
  }
})

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.userblock) {
      req.session.loginErr = "user blocked"
      res.redirect('/login')
    } else {
      if (response.status) {
        console.log(response.status);
        req.session.user = response.user
        req.session.loggedIn = true;
        res.redirect('/login')
      } else {
        req.session.loginErr = "Invalid Email or Password"
        res.redirect('/login')
      }
    }
  })
})

router.get('/signup', function (req, res) {
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    res.render('user/signup', { signerr: req.session.signErr })
    req.session.signErr = false
  }
})

let signupData;
router.post('/signup', (req, res) => {
  //additional key status1 send to db
  req.body.status1 = true
  userHelpers.doSignup(req.body).then((response) => {
    console.log(req.body)
    signupData = req.body 
    if (response.status) {
      req.session.signErr = "account already exist"
      res.render('user/signup', { signerr: req.session.signErr })
      req.session.signErr = false
    } else {
      res.redirect('/otp-page')
    }
  })
})

router.get('/otp-page', (req, res) => {
  res.render('user/otp-page', { otpsignErr: req.session.otpsignErr, Mobile: signupData.Mobile })
})

router.post('/otp-verify', (req, res, next) => {
  userHelpers.otpVerify(req.body.otp, signupData).then((response) => {
    if (response.status) {
      res.redirect('/login')
    } else {
      req.session.otpsignErr = "invalid otp"
      res.redirect('/otp-page')
    }
  })  
})

router.get('/category-wise/:id', verifyCartCount, (req, res) => {
  productHelpers.getSpecificCategory(req.params.id).then((productlist) => {
    res.render('user/category-wise', { userhead: true, productlist, cartCount, userlog ,mycategory:categoryHelper})
  })
})  
 
//working
router.get('/product-view/:id', verifyCartCount, (req, res) => {
  productHelpers.productview(req.params.id).then((productview) => {
    console.log(productview);
    res.render('user/product-view', { userhead: true, productview, userlog, cartCount,productScript:true })
  })
})

router.get('/logout', (req, res) => {
  req.session.user = null
  req.session.loggedIn = null
  res.redirect('/')
})

router.get('/add-to-cart/:id',async (req, res) => {
  console.log('api call');
  console.log("req.params.id",req.params.id);
  //let categorydetails=await userHelpers.getCategoryOffer(req.params.id)
  //console.log("categorydetails",categorydetails);
  
  //req.session.offer=categorydetails.offer
  //checking
  userHelpers.addToCart(req.params.id, userlog._id).then(() => {
    res.json({ status: true })
  })
})

router.get('/cart', verifyLogin, verifyCartCount, async (req, res, next) => {
  let products = await userHelpers.getCartProducts(req.session.user._id)
  if(cartCount!=0){
    let cartTable = true
    let totalValue = await userHelpers.getTotalAmount(req.session.user._id)
    res.render('user/cart', { userhead: true, products, userlog, cartCount, totalValue,cartTable})
  }else{
    res.render('user/cart', { userhead: true, products, userlog, cartCount})
  }
})
//working on 22082022
router.post('/change-product-quantity', (req, res) => {
  let details = req.body
  details.count = parseInt(details.count)
  details.quantity = parseInt(details.quantity)
  if(details.count == -1 && details.quantity == 1){
    userHelpers.removeQuantity(details).then(async(response)=>{
      res.json(response) 
    })
  }else{
    userHelpers.changeProductQuantity(details).then(async(response) => {
      response.total=await userHelpers.getTotalAmount(req.body.user)
      console.log("response",response);
        res.json(response)
    })
  }
})
//
router.post('/delete-cartproduct', (req, res) => {
  userHelpers.deleteCartProduct(req.body.cart, req.body.product).then((response) => {
    res.json(response)
  })
})

router.get('/place-order',verifyLogin,verifyCartCount,async(req,res)=>{
  if(cartCount!=0){
    let total=await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{userhead:true,cartCount,total,userlog})
  }else{
    res.redirect('/cart')
  }
})

router.post('/place-order',verifyLogin,async(req,res)=>{
  let products=await userHelpers.getCartProductList(req.body.userId)
  
  ////
  let totalPrice;
  let discount;
  if(req.session.amount){
    totalPrice=req.session.amount.grandtotal
    discount=req.session.amount.discountamount
  }else{
     totalPrice=await userHelpers.getTotalAmount(req.body.userId)
  }
  ////
  req.session.cartProductDetails=products
  req.session.total=totalPrice
  userHelpers.placeOrder(req.body,products,totalPrice,discount).then((orderId)=>{
    req.session.neworderId=orderId
    
    if(req.body['payment-method']==='COD'){
      userHelpers.cartClearing(userlog._id).then(()=>{ 
        userHelpers.stockManagement(products)
        userHelpers.userAppliedCoupon(userlog._id,req.session.coupondata)
        res.json({codSuccess:true})
      })
    }else if(req.body['payment-method']==='ONLINE-RAZOR'){
      userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
        response.razorSuccess = true
        res.json(response)
      })
    }else if(req.body['payment-method']==='ONLINE-PAYPAL'){
      userHelpers.converter(totalPrice).then((price)=>{
        let converted = parseInt(price)
        userHelpers.generatePaypal(orderId,converted).then((response)=>{
          response.paypalSuccess = true
          res.json(response)
        })
      })
    }
  })
  req.session.amount=null
  
  discount=null
  console.log(req.body);
})
 
//paypal
let amount;
router.get('/success/:id', (req, res) => {
  userHelpers.converter(req.session.total).then((price)=>{
    let convertedamount = parseInt(price)
    amount = convertedamount
    console.log(req.params.id);
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
  
    const execute_payment_json = {
      "payer_id": payerId,
      "transactions": [{
          "amount": {
              "currency": "USD",
              "total": amount
          }
      }]
    }; 
  
    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
      if (error) {
          console.log(error.response);
          throw error;
      } else {
          //console.log(JSON.stringify(payment));
          console.log("paypal payment succes");
          userHelpers.stockManagement(req.session.cartProductDetails)
          userHelpers.changePaymentStatus(req.params.id).then(()=>{
            userHelpers.userAppliedCoupon(userlog._id,req.session.coupondata)
            userHelpers.cartClearing(userlog._id).then(()=>{
              res.redirect('/order-success');
            })
          })
      }
  });
  })
   
}); 

router.get('/cancel', (req, res) => {
  userHelpers.deleteTheOrder(req.session.neworderId).then(()=>{
    res.redirect('/orders')
  })
  
});
//stockmanagement
router.get('/order-success',verifyCartCount,(req,res)=>{
  req.session.coupondata=null
  res.render('user/order-success',{userhead:true,userlog,cartCount})
}) 

router.get('/orders',verifyLogin,async(req,res)=>{ 
    userHelpers.deletePending().then(async()=>{
      let orders=await userHelpers.getUserOrders(userlog._id)
      console.log(orders);
    res.render('user/orders',{userhead:true,userlog,orders,cartCount})
    })
    
})

router.get('/view-order-products/:id',verifyLogin,async(req,res)=>{
  console.log(req.params.id);
  let products=await userHelpers.getOrderProducts(req.params.id)
  let orders=await userHelpers.getCurrentOrder(req.params.id)
  let deliverystatus=await userHelpers.getDeliveryStatus(req.params.id)
  console.log("hey",deliverystatus);
  //console.log(orders);
  res.render('user/view-order-products',{userhead:true,userlog,products,orders,deliverystatus})
})

//razor
router.post('/verify-payment',(req,res)=>{ 
console.log(req.body);
userHelpers.verifyPayment(req.body).then(()=>{
userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
  console.log("Payment Success");
  userHelpers.userAppliedCoupon(userlog._id,req.session.coupondata)
  userHelpers.stockManagement(req.session.cartProductDetails)
  userHelpers.cartClearing(userlog._id).then(()=>{
    res.json({status:true})
  }) 
})  
}).catch(()=>{
  console.log(err);
  res.json({status:false,errMsg:''})
})
})
 

router.post('/cancel-order',((req,res)=>{
  userHelpers.cancelOrder(req.body.product).then((response)=>{
    res.json(response)
  })
}))

router.get('/profile',verifyLogin,((req,res)=>{
  userHelpers.getProfile(userlog._id).then((profiledata)=>{
    console.log("checking");
    console.log(profiledata);
    res.render('user/profile',{userhead:true,cartCount,profiledata,userlog})
  })
}))

router.get('/change-password',verifyLogin,((req,res)=>{
  try{
    res.render('user/change-password',{userhead:true,cartCount,userlog})
  }catch(err)
  {
    console.log(err)
    res.send('404')
  }
  
}))

router.post('/change-password',((req,res)=>{
 userHelpers.changePassword(req.body,userlog._id).then(()=>{
  console.log("password updated");
  res.redirect('/')
 })
}))

router.get('/add-address',verifyLogin,(req,res)=>{
  res.render('user/add-address',{userlog,userhead:true,cartCount})
})

router.post('/add-address',(req,res)=>{
  userHelpers.addNewAddress(req.body,userlog._id).then(()=>{
    res.redirect('/profile')
  })
})

router.get('/show-address',verifyLogin,async(req,res)=>{
  useradd=await userHelpers.getAddress(userlog._id)
  console.log(useradd);
  res.render('user/show-address',{userlog,userhead:true,cartCount,useradd})
})

router.get('/edit-profile',verifyLogin,(req,res)=>{
  userHelpers.getProfile(userlog._id).then((profiledata)=>{
    res.render('user/edit-profile',{userhead:true,cartCount,userlog,profiledata})
  })
})


router.post('/edit-profile/:id',(req,res)=>{
  userHelpers.editProfile(req.body,req.params.id).then(()=>{
    res.redirect('/profile')
  })
})
//working on
router.post('/coupon',async(req,res)=>{
  req.session.coupondata=req.body.coupon
  let amount ={} ;
   userHelpers.couponCheck(userlog._id,req.body).then((response) => {
    if(response.coupon){
     amount=response
      req.session.amount = amount
      amount.status=true
      res.json(amount)
    }else if(response.usedcoupon){ 
      console.log('coupon already used');
      amount.used=true
      res.json(amount)
    }else if(response.small){
      console.log('Not within Cap limits');
      amount.small=true
      res.json(amount)
    }else if(response.expired){
      console.log('Coupon expired');
      amount.expired=true
      res.json(amount)
    }else{
      console.log('coupon invalid');
      amount.status=false
      res.json(amount)
    }
  }) 
}) 




module.exports = router;
 
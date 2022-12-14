const { response } = require('express');
var express = require('express');
const { TaskRouterGrant } = require('twilio/lib/jwt/AccessToken');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers')
const paypal = require('paypal-rest-sdk');
var ObjectID = require('mongodb').ObjectId

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

const properId = (req,res,next) => {
  if (ObjectID.isValid(req.params.id)) {
    next()
  } else {
    res.redirect('/page404')
  } 
}    

/* GET home page. */
let userlog;
router.get('/', async (req, res, next)=> {
  try {
     userlog = req.session.user;
    if (req.session.loggedIn) {
      cartCount = await userHelpers.getCartCount(req.session.user._id)
      banner = await userHelpers.getBanners()
      let productlist = await productHelpers.getAllProductList()
      let wishCheck = await userHelpers.wishCheck(userlog._id)
      if(wishCheck){
        for(var i=0;i<wishCheck.products.length;i++){
          for(var j=0;j<productlist.length;j++){
            if(productlist[j]._id.toString() == wishCheck.products[i].item.toString()){
              console.log("working1");
              productlist[j].wishlist=true
              break;
            }
          }
        }
      }
      res.render('user/index', { userhead: true, userlog, productlist, cartCount, bannershow: banner})
    } else {
      productHelpers.getAllProductList().then((productlist) => {
        userHelpers.getBanners().then((banner) => {
          res.render('user/index', { userhead: true, productlist, bannershow: banner })
        })
      })
    }
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})
//
router.get('/allproducts', verifyCartCount, async (req, res, next)=> {

  try {
   // req.query////
    let mysubcategory = await userHelpers.getAllSubCategory()
    let productlist=await productHelpers.getProductList()
     let mycategory=await userHelpers.getAllCategory()
        if (req.session.loggedIn) {
          let wishCheck = await userHelpers.wishCheck(userlog._id)
      if(wishCheck){
        for(var i=0;i<wishCheck.products.length;i++){
          for(var j=0;j<productlist.length;j++){
            if(productlist[j]._id.toString() == wishCheck.products[i].item.toString()){
              console.log("working1");
              productlist[j].wishlist=true
              break;
            }
          }
        }
      }
          res.render('user/category-wise', { userhead: true, userlog, productlist, cartCount, mycategory,mysubcategory })
        } else {
          res.render('user/category-wise', { userhead: true, userlog, productlist, mycategory,mysubcategory })
        }
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})
//

//
router.get('/allproducts/:pageno', verifyCartCount, async (req, res, next)=> {
  try {
    let mysubcategory = await userHelpers.getAllSubCategory()
    let productlist=await productHelpers.getProductList( req.params.pageno)
     let mycategory=await userHelpers.getAllCategory()
        if (req.session.loggedIn) {
          let wishCheck = await userHelpers.wishCheck(userlog._id)
      if(wishCheck){
        for(var i=0;i<wishCheck.products.length;i++){
          for(var j=0;j<productlist.length;j++){
            if(productlist[j]._id.toString() == wishCheck.products[i].item.toString()){
              console.log("working1");
              productlist[j].wishlist=true
              break;
            }
          }
        }
      }
          res.render('user/category-wise', { userhead: true, userlog, productlist, cartCount, mycategory,mysubcategory })
        } else {
          res.render('user/category-wise', { userhead: true, userlog, productlist, mycategory,mysubcategory })
        }
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})
//
router.get('/login', (req, res, next) => {
  try {
    if (req.session.loggedIn) {
      res.redirect('/')
    } else {
      res.render('user/login', { loginerr: req.session.loginErr })
      req.session.loginErr = false
    }
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.post('/login', (req, res) => {
  try {
    userHelpers.doLogin(req.body).then((response) => {
      if (response.userblock) {
        req.session.loginErr = "user blocked"
        res.redirect('/login')
      } else {
        if (response.status) {
          req.session.user = response.user
          req.session.loggedIn = true;
          res.redirect('/login')
        } else {
          req.session.loginErr = "Invalid Email or Password"
          res.redirect('/login')
        }
      }
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.get('/signup', function (req, res) {
  try {
    if (req.session.loggedIn) {
      res.redirect('/')
    } else {
      res.render('user/signup', { signerr: req.session.signErr })
      req.session.signErr = false
    }
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

let signupData;
router.post('/signup', (req, res) => {
  try {
    //additional key status1 send to db
    req.body.status1 = true
    let number = parseInt(req.body.Mobile)
    let newReferralCode = number.toString(16)
    req.body.yourReferralCode = newReferralCode
    req.session.referral = req.body
    userHelpers.doSignup(req.body).then((response) => {
      console.log(req.body)
      signupData = req.body
      if (response.status) {
        req.session.signErr = "account already exist"
        res.render('user/signup', { signerr: req.session.signErr })
        req.session.signErr = false
      }else if(response.referral){
        req.session.refErr = "invaild referral code"
        res.render('user/signup', { referr: req.session.refErr })
        req.session.refErr = false
      } else {
        res.redirect('/otp-page')
        // res.redirect('/login')
      }
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.get('/otp-page', (req, res) => {
  try {
    res.render('user/otp-page', { otpsignErr: req.session.otpsignErr, Mobile: signupData.Mobile })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.get('/resend-otp', (req, res) => {
  try {
    userHelpers.resendOtp(signupData)
    res.render('user/otp-page', { otpsignErr: req.session.otpsignErr, Mobile: signupData.Mobile })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.post('/otp-verify', (req, res, next) => {
  walletAction = "Referral credit"
  try {
    userHelpers.otpVerify(req.body.otp, signupData).then((response) => {
      if (response.status) {
        userHelpers.referralUpdate(req.session.referral)
        userHelpers.updateWalletCreditReferral(req.session.referral, walletAction)
        res.redirect('/login')
      } else {
        req.session.otpsignErr = "invalid otp"
        res.redirect('/otp-page')
      }
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})
//
router.get('/category-wise/:id',properId, verifyCartCount,async (req, res) => {
  try {
    let productlist = await productHelpers.getSpecificCategory(req.params.id)
    let mysubcategory = await userHelpers.getAllSubCategory()
    let mycategory=await userHelpers.getAllCategory()
    if (req.session.loggedIn) {
      let wishCheck = await userHelpers.wishCheck(userlog._id)
      if(wishCheck){
        for(var i=0;i<wishCheck.products.length;i++){
          for(var j=0;j<productlist.length;j++){
            if(productlist[j]._id.toString() == wishCheck.products[i].item.toString()){
              console.log("working1");
              productlist[j].wishlist=true
              break;
            }
          }
        }
      }
      res.render('user/category-wise', { userhead: true, userlog, productlist, cartCount, mycategory,mysubcategory })
    } else {
      res.render('user/category-wise', { userhead: true, userlog, productlist, mycategory,mysubcategory })
    }
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})
// 
router.get('/sub-category-wise/:id',properId, verifyCartCount,async (req, res) => {
  try {
    let productlist = await productHelpers.getSpecificSubCategory(req.params.id)
    let mysubcategory = await userHelpers.getAllSubCategory()
    let mycategory=await userHelpers.getAllCategory()
    if(req.session.loggedIn){
      let wishCheck = await userHelpers.wishCheck(userlog._id)
      if(wishCheck){
        for(var i=0;i<wishCheck.products.length;i++){
          for(var j=0;j<productlist.length;j++){
            if(productlist[j]._id.toString() == wishCheck.products[i].item.toString()){
              console.log("working1");
              productlist[j].wishlist=true
              break;
            }
          }
        }
      }
      res.render('user/category-wise', { userhead: true, productlist, cartCount, userlog,mycategory, mysubcategory})
    }else{
      res.render('user/category-wise', { userhead: true, productlist, userlog,mycategory, mysubcategory})
    }
      
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})
// 
router.get('/product-view/:id',properId, async (req, res) => {
  try {
    let productview = await productHelpers.productview(req.params.id)
    res.render('user/product-view', { userhead: true, productview, userlog, cartCount, productScript: true })    
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.get('/logout', (req, res) => {
  try {
    req.session.user = null
    req.session.loggedIn = null
    res.redirect('/')
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.get('/add-to-cart/:id', async (req, res) => {
  try {
    console.log('api call');
    userHelpers.addToCart(req.params.id, userlog._id).then(() => {
      res.json({ status: true })
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.get('/add-to-wishlist/:id', async (req, res) => {
  try {
    console.log('wishlist api call');
    userHelpers.addToWishlist(req.params.id, userlog._id).then(() => {
      console.log("response", response);
      res.json(response)
      response.status = false
      response.exist = false
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.get('/cart', verifyLogin, verifyCartCount, async (req, res, next) => {
  try {
    let products = await userHelpers.getCartProducts(req.session.user._id)
    if (cartCount != 0) {
      let cartTable = true
      let totalValue = await userHelpers.getTotalAmount(req.session.user._id)
      res.render('user/cart', { userhead: true, products, userlog, cartCount, totalValue, cartTable })
    } else {
      res.render('user/cart', { userhead: true, products, userlog, cartCount })
    }
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.get('/wishlist', verifyLogin, verifyCartCount, async (req, res, next) => {
  try {
    let products = await userHelpers.getWishlistProducts(userlog._id)
    console.log("products", products);
    res.render('user/wishlist', { userhead: true, products, userlog, cartCount })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.post('/change-product-quantity', (req, res) => {
  try {
    let details = req.body
    details.count = parseInt(details.count)
    details.quantity = parseInt(details.quantity)
    if (details.count == -1 && details.quantity == 1) {
      userHelpers.removeQuantity(details).then(async (response) => {
        res.json(response)
      })
    } else {
      userHelpers.changeProductQuantity(details).then(async (response) => {
        response.total = await userHelpers.getTotalAmount(req.body.user)
        console.log("response", response);
        res.json(response)
      })
    }
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.post('/delete-cartproduct', (req, res) => {
  try {
    userHelpers.deleteCartProduct(req.body.cart, req.body.product).then((response) => {
      res.json(response)
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }    
})

router.post('/delete-wishlistproduct', (req, res) => {
  try {
    userHelpers.deleteWishlistProduct(req.body.wishlist, req.body.product).then((response) => {
      res.json(response)
    })
  } catch (error) {
    console.log(error); 
    res.redirect('/user/page404')    
  }    
})
//dd
router.post('/delete-wishlistproduct1', (req, res) => {
  try {
    userHelpers.deleteWishlistProduct1(userlog._id, req.body.product).then((response) => {
      res.json(response)
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})
//
router.get('/place-order', verifyLogin, verifyCartCount, async (req, res) => {
  try {
    if (cartCount != 0) {
      let total = await userHelpers.getTotalAmount(req.session.user._id)
      let useradd = await userHelpers.getAddress(userlog._id)
      let walletBalance = await userHelpers.getWalletBalance(userlog._id)
      res.render('user/place-order', { userhead: true, cartCount, total, userlog, useradd, walletBalance })
    } else {
      res.redirect('/cart')
    }
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.post('/place-order', verifyLogin, async (req, res) => {
  try {
    let products = await userHelpers.getCartProductList(req.body.userId)
    let walletBalance = await userHelpers.getWalletBalance(userlog._id)
    let totalPrice;
    let discount;
    if (req.session.amount) {
      totalPrice = req.session.amount.grandtotal
      discount = req.session.amount.discountamount
    } else {
      totalPrice = await userHelpers.getTotalAmount(req.body.userId)
    }
    req.session.cartProductDetails = products
    req.session.total = totalPrice
    userHelpers.placeOrder(req.body, products, totalPrice, discount).then((orderId) => {
      req.session.neworderId = orderId

      if (req.body['payment-method'] === 'COD') {
        userHelpers.cartClearing(userlog._id).then(() => {
          userHelpers.stockManagement(products)
          userHelpers.userAppliedCoupon(userlog._id, req.session.coupondata)
          res.json({ codSuccess: true })
        })
      } else if (req.body['payment-method'] === 'ONLINE-RAZOR') {
        userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
          response.razorSuccess = true
          res.json(response)
        })
      } else if (req.body['payment-method'] === 'ONLINE-PAYPAL') {
        userHelpers.converter(totalPrice).then((price) => {
          let converted = parseInt(price)
          userHelpers.generatePaypal(orderId, converted).then((response) => {
            response.paypalSuccess = true
            res.json(response)
          })
        })
      }
      else if (req.body['payment-method'] === 'WALLET') {
        if (walletBalance < totalPrice) {
          res.json({ walletLow: true })
        } else {
          wallet = walletBalance - totalPrice
          userHelpers.updateWallet(userlog._id, wallet, orderId, totalPrice)
          userHelpers.stockManagement(products)
          userHelpers.userAppliedCoupon(userlog._id, req.session.coupondata)
          userHelpers.cartClearing(userlog._id)
          userHelpers.changePaymentStatus(orderId).then(() => {
            res.json({ walletSuccess: true })
          })
        }
      }
    })
    req.session.amount = null
    discount = null
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

//paypal
let amount;
router.get('/success/:id', (req, res) => {
  try {
    userHelpers.converter(req.session.total).then((price) => {
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
          console.log("paypal payment succes");
          userHelpers.stockManagement(req.session.cartProductDetails)
          userHelpers.changePaymentStatus(req.params.id).then(() => {
            userHelpers.userAppliedCoupon(userlog._id, req.session.coupondata)
            userHelpers.cartClearing(userlog._id).then(() => {
              res.redirect('/order-success');
            })
          })
        }
      });
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
});

//paypal
router.get('/cancel', (req, res) => {
  try {
    userHelpers.deleteTheOrder(req.session.neworderId).then(() => {
      res.redirect('/orders')
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
});

router.get('/order-success', verifyCartCount, (req, res) => {
  try {
    req.session.coupondata = null
    res.render('user/order-success', { userhead: true, userlog, cartCount })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.get('/orders', verifyLogin, async (req, res) => {
  try {
    userHelpers.deletePending().then(async () => {
      let orders = await userHelpers.getUserOrders(userlog._id)
      console.log(orders);
      res.render('user/orders', { userhead: true, userlog, orders, cartCount })
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})  

router.get('/orders/:pageno', verifyLogin, async (req, res) => {
  try {
    userHelpers.deletePending().then(async () => {
      let orders = await userHelpers.getUserOrders(userlog._id, req.params.pageno)
      console.log(orders);
      res.render('user/orders', { userhead: true, userlog, orders, cartCount })
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

let viewOrder;
router.get('/view-order-products/:id',properId, verifyLogin, async (req, res) => {
  viewOrder = req.params.id
  try {
    let products = await userHelpers.getOrderProducts(req.params.id)
    let orders = await userHelpers.getCurrentOrder(req.params.id)
    let deliverystatus = await userHelpers.getDeliveryStatus(req.params.id)
    res.render('user/view-order-products', { userhead: true, userlog, products, orders, deliverystatus })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

//razor
router.post('/verify-payment', (req, res) => {
  try {
    console.log(req.body);
    userHelpers.verifyPayment(req.body).then(() => {
      userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
        console.log("Payment Success");
        userHelpers.userAppliedCoupon(userlog._id, req.session.coupondata)
        userHelpers.stockManagement(req.session.cartProductDetails)
        userHelpers.cartClearing(userlog._id).then(() => {
          res.json({ status: true })
        })
      })
    }).catch(() => {
      console.log(err);
      res.json({ status: false, errMsg: '' })
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

let walletAction;
router.post('/cancel-order', async (req, res) => {
  walletAction = "Product cancelled"
  try {  
    if (req.body.payment != "COD") {
      await userHelpers.cancelAmountWallet(userlog._id, req.body.amount)
      await userHelpers.updateWalletCredit(userlog._id, req.body.orId, req.body.amount, walletAction)
      await userHelpers.increaseStock(req.body.orId)
      await userHelpers.cancelOrder(req.body.orId).then((response) => {
        res.json(response)
      })
    } else {
      await userHelpers.cancelOrder(req.body.orId).then((response) => {
        res.json(response)
      })
    }
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.get('/profile', verifyLogin, (async (req, res) => {
  try {
    let profiledata = await userHelpers.getProfile(userlog._id)
    let walletDetails = await userHelpers.getWallet(userlog._id)
    res.render('user/profile', { userhead: true, cartCount, profiledata, userlog, walletDetails })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
}))

router.get('/change-password', verifyLogin, ((req, res) => {
  try {
    res.render('user/change-password', { userhead: true, cartCount, userlog })
  } catch (error) {
    console.log(error)
    res.send('404')
  }
}))

router.post('/change-password', ((req, res) => {
  try {
    userHelpers.changePassword(req.body, userlog._id).then(() => {
      console.log("password updated");
      res.redirect('/')
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
}))

router.get('/add-address', verifyLogin, (req, res) => {
  try {
    res.render('user/add-address', { userlog, userhead: true, cartCount })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.post('/add-address', (req, res) => {
  try {
    userHelpers.addNewAddress(req.body, userlog._id).then(() => {
      res.redirect('/show-address')
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.get('/show-address', verifyLogin, async (req, res) => {
  try {
    let useradd = await userHelpers.getAddress(userlog._id)
    console.log("useradd", useradd);
    res.render('user/show-address', { userlog, userhead: true, cartCount, useradd })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})


router.get('/edit-profile', verifyLogin, (req, res) => {
  try {
    userHelpers.getProfile(userlog._id).then((profiledata) => {
      res.render('user/edit-profile', { userhead: true, cartCount, userlog, profiledata })
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})


router.post('/edit-profile/:id', (req, res) => {
  try {
    userHelpers.editProfile(req.body, req.params.id).then(() => {
      res.redirect('/profile')
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.post('/coupon', async (req, res) => {
  try {
    req.session.coupondata = req.body.coupon
    let amount = {};
    userHelpers.couponCheck(userlog._id, req.body).then((response) => {
      if (response.coupon) {
        amount = response
        req.session.amount = amount
        amount.status = true
        res.json(amount)
      } else if (response.usedcoupon) {
        console.log('coupon already used');
        amount.used = true
        res.json(amount)
      } else if (response.small) {
        console.log('Not within Cap limits');
        amount.small = true
        res.json(amount)
      } else if (response.expired) {
        console.log('Coupon expired');
        amount.expired = true
        res.json(amount)
      } else {
        console.log('coupon invalid');
        amount.status = false
        res.json(amount)
      }
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.post('/save-address', (req, res) => {
  try {
    userHelpers.addNewAddress(req.body, userlog._id).then((response) => {
      res.json(response)
    })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.get('/edit-address/:id',properId, async (req, res) => {
  try {
    let useradd = await userHelpers.getSpecificAddress(req.params.id)
    res.render('user/edit-address', { userhead: true, cartCount, userlog, useradd })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.post('/edit-address/:id', (req, res) => {
  try {
    userHelpers.editAddress(req.body, req.params.id)
    res.redirect('/show-address')
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.get('/delete-address/:id', (req, res) => {
  try {
    userHelpers.deleteAddress(req.params.id)
    res.redirect('/show-address')
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.post('/balance-check', (req, res) => {
  try {
    if (req.body.balance > req.body.amount) {
      res.json({ walletLow: true })
    } else {
      res.json({ walletLow: false })
    }
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.post('/invoice', async (req, res) => {
  try {
    let products = await userHelpers.getOrderProducts(viewOrder)
    let orders = await userHelpers.getCurrentOrder(viewOrder)
    await userHelpers.downloadInvoice(products, orders, userlog)
    response.status = true
    res.json(response)
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.get('/show-wallet', verifyLogin, async (req, res) => {
  try {
    let walletDetails = await userHelpers.getWalletDetails(userlog._id)
    console.log("walletDetails", walletDetails);
    res.render('user/show-wallet', { userhead: true, walletDetails, userlog, cartCount })
  } catch (error) {
    console.log(error);
    res.redirect('/user/page404')
  }
})

router.post('/change-status',(req,res)=>{
  try{
    userHelpers.changeDeliveryStatus(req.body.order,req.body.status).then(()=>{
      res.json(response)
    }) 
  }catch(error){
    console.log(error); 
  res.redirect('/admin/adminpage404')
  }
})

router.get('/page404',(req,res)=>{
  res.render('user/page404', { userhead: true })
})

module.exports = router;

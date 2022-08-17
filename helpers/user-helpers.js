var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
var Handlebars = require('handlebars');
const { response } = require('express');
var objectId = require('mongodb').ObjectId

require('dotenv').config()
const client = require('twilio')(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN)
const Razorpay = require('razorpay');
const { resolve } = require('node:path');
const paypal = require('paypal-rest-sdk');
const { log } = require('node:console');

const CC = require("currency-converter-lt");

var instance = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET,
});

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': process.env.CLIENT_ID,
    'client_secret': process.env.CLIENT_SECRET
  });

Handlebars.registerHelper("inc", function (value, options) {
    return parseInt(value) + 1;
});

module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            // let mobile = await db.get().collection(collection.USER_COLLECTION).findOne({ Mobile: userData.Mobile });
            let email = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email });
            if (email) {

                console.log('same email');
                response.status = true
                resolve(response)

            }
            // else if (mobile) {

            //     console.log('same mobile number');
            //     response.status = true
            //     resolve(response)

            // } 
            else {

                userData.Password = await bcrypt.hash(userData.Password, 10)
                client.verify
                    .services(process.env.SERVICE_SID)
                    .verifications.create({
                        to: `+91${userData.Mobile}`,
                        channel: 'sms'
                    }).then((resp1) => {
                        console.log("response1", resp1);
                    })
                console.log('no same email');
                resolve(response)
            }
        })
    },
    otpVerify: (otp, signupData) => {
        return new Promise((resolve, reject) => {
            client.verify
                .services(process.env.SERVICE_SID)
                .verificationChecks.create({
                    to: `+91${signupData.Mobile}`,
                    code: otp
                }).then((resp1) => {
                    console.log("otp res", resp1);
                    if (resp1.valid) {
                        db.get().collection(collection.USER_COLLECTION).insertOne(signupData).then((data) => {
                            resolve(data.insertedId)
                        })
                        console.log('otp verified successfully');
                        response.status = true
                        resolve(response)
                    } else {
                        response.status = false
                        resolve(response)
                    }
                })
        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                if (user.status1 == true) {
                    bcrypt.compare(userData.Password, user.Password).then((status) => {
                        if (status) {
                            console.log("login success")
                            response.user = user
                            response.status = true
                            resolve(response)
                        } else {
                            console.log("login failed");
                            resolve({ status: false })
                        }
                    })
                } else {
                    resolve({ userblock: true })
                }
            } else {
                console.log("login failed");
                resolve({ status: false })
            }
        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                console.log(proExist);
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userId), 'products.item': objectId(proId) },
                            {
                                $inc: { 'products.$.quantity': 1 }
                            })
                } else {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userId) },
                            {
                                $push: { products: proObj }

                            }).then(() => {
                                resolve()
                            })
                }
            } else {
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $lookup: {
                        from: collection.BRAND_COLLECTION,
                        localField: 'product.Brands',
                        foreignField: '_id',
                        as: 'Brands'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] },Brands:'$Brands.Name'
                    }
                }
            ]).toArray()
            console.log(cartItems);
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length
                console.log(count);
            }
            resolve(count)
        })
    },
    //////////////
    changeProductQuantity: (details) => {
        // details.count = parseInt(details.count)
        // details.quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': details.count }
                        }).then((response) => {
                            resolve({ status: true })
                        })
        })
    },
    removeQuantity:(details)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart) },
                        {
                            $pull: { products: { item: objectId(details.product) } }
                        }).then((response) => {
                            response.removeProduct = true
                            resolve(response)
                        })
        })
    },
    /////////////
    deleteCartProduct: (cartId, proId) => {
        return new Promise((resolve, reject) => {
            db.get()
                .collection(collection.CART_COLLECTION)
                .updateOne({ _id: objectId(cartId) },
                    {
                        $pull: { products: { item: objectId(proId) } }
                    }).then((response) => {
                        response.removed = true
                        resolve(response)
                    })
        })
    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: [{ $toInt: '$quantity' }, { $toInt: '$product.Price' }] } }
                    }
                }
            ]).toArray()
            console.log(total);
            resolve(total[0].total)
        })
    },
    //working
    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            console.log(order, products, total);
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                deliveryDetails: {
                    name: order.name,
                    mobile: order.mobile,
                    pincode: order.pincode,
                    country: order.country,
                    state: order.state,
                    city: order.city,
                    address: order.address
                },
                userId: objectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                status: status,
                date: new Date().toDateString()
               
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                console.log('order id:'+response.insertedId);
                resolve(response.insertedId)
            })
        })
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            resolve(cart.products)
        })
    },
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            console.log(userId);
            let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { userId: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                        totalAmount: 1,
                        paymentMethod:1,
                        status:1,
                        date:1,
                        deliveryDetails:1
                    }
                }, 
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        totalAmount: 1,
                        product: {
                            $arrayElemAt: ['$product', 0]
                        },
                        totalAmount: 1,
                        paymentMethod:1,
                        status:1,
                        date:1,
                        deliveryDetails:1
                    }
                }
            ]).toArray()
            
            resolve(orders)
        })
    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                }, 
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project:{
                        Name:'$product.Name',
                        Category:'$product.Category',
                        Brands:'$product.Brands',
                        SubCategory:'$product.SubCategory',
                        Images:'$product.Images',
                        Price:'$product.Price',
                        quantity:1
                    }
                },
                {
                    $lookup:{
                        from: collection.CATEGORY_COLLECTION,
                        localField: 'Category',
                        foreignField: '_id',
                        as: 'Category'
                    }
                },
                {
                    $lookup:{
                        from: collection.SUB_CATEGORY_COLLECTION,
                        localField: 'SubCategory',
                        foreignField: '_id',
                        as: 'SubCategory'
                    }
                },
                {
                    $lookup:{
                        from: collection.BRAND_COLLECTION,
                        localField: 'Brands',
                        foreignField: '_id',
                        as: 'Brands'
                    }
                },
                {
                    $unwind:'$Images'
                },
                {
                    $project: {
                          product: { $arrayElemAt: ['$product', 0] },
                          Name:1,
                          Category:'$Category.Name',
                          SubCategory:'$SubCategory.Name',
                          Brands:'$Brands.Name',
                          Images:1,
                          Price:1,
                          quantity:1
                    }
                }
            ]).toArray()
            console.log(orderItems);
            resolve(orderItems)
        })
    },
    generateRazorpay: (orderId,total) => {
        return new Promise((resolve, reject) => {           
            instance.orders.create({
                amount: total*100,
                currency: "INR",
                receipt: ""+orderId,
                notes: {
                    key1: "value3",
                    key2: "value2"
                }
            },function(err,order){
                if(err){
                    console.log(err);
                }else{
                    console.log("New Order :",order);
                    resolve(order)
                }               
            })
        })
    },
    verifyPayment:(details)=>{
        return new Promise(async(resolve,reject)=>{
            const {
                createHmac
              } = await import('node:crypto');             
              let hmac = createHmac('sha256', process.env.KEY_SECRET);
              hmac.update(details['payment[razorpay_order_id]'] + "|" + details['payment[razorpay_payment_id]']);
              hmac=hmac.digest('hex')
              if(hmac==details['payment[razorpay_signature]']){  
                resolve()
              }else{
                reject()
              }
        })
    },
    generatePaypal:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
            var create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": "http://localhost:3000/success/"+orderId,
                    "cancel_url": "http://localhost:3000/cancel"
                },
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": "item",
                            "sku": "item",
                            "price": total,
                            "currency": "USD",
                            "quantity": 1
                        }]
                    },
                    "amount": {
                        "currency": "USD",
                        "total": total
                    },
                    "description": "This is the payment description."
                }]
            };
            paypal.payment.create(create_payment_json, function (error, payment) {
                if (error) {
                    console.log(error)
                   // throw error;
                } else {
                    console.log(payment)
                    resolve(payment)
                }
            })
           
        })
    },
    changePaymentStatus:(orderId,proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }
            ).then(()=>{
                resolve()
            })
        })
    },
    cartClearing:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(proId) })
            resolve()
        })
    },
    cancelOrder:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'cancelled'
                }
            }).then((response)=>{
                resolve(response)
            })
        })
    },changePassword:(passData,userId)=>{
        
        return new Promise(async(resolve,reject)=>{
            newPassword = await bcrypt.hash(passData.Password, 10)
            db.get().collection(collection.USER_COLLECTION)
            .updateOne({_id:objectId(userId)},
            {
                $set:{
                    Password:newPassword
                }
            }).then(()=>{
                resolve()
            })
        })
    },
    getBanners: () => {
        return new Promise(async (resolve, reject) => {
            let banner = await db.get().collection(collection.BANNER_COLLECTION).find().toArray()
            resolve(banner)
        })
    },
    addNewAddress: (userData, userId) => {
        let addressObj = {
            Address: userData.Address,
            State: userData.State,
          Pincode: userData.Pincode,
          City: userData.City,
        };
        return new Promise((resolve, reject) => {
          db.get()
            .collection(collection.USER_COLLECTION)
            .updateOne(
              { _id: objectId(userId) },
              {
                $push: { address: addressObj },
              }
            )
            .then(() => {
              resolve();
            });
        });
      },
    getAddress:(userId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION).findOne({_id:objectId(userId)}).then((response)=>{
                console.log("getaddress");
                resolve(response)
            })
        })
    },editProfile:(body,userId)=>{
        console.log(body);
        console.log(userId);
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},{
                $set:{
                    Username:body.Username,
                    Email:body.Email,
                    Mobile:body.Mobile
                }
            }).then(()=>{
                console.log("ok updated");
                resolve()
            })
        })
    },getProfile:(userId)=>{
        return new Promise(async(resolve,reject)=>{
           let profiledata=await db.get().collection(collection.USER_COLLECTION).find({_id:objectId(userId)}).toArray()
           console.log(profiledata);
           resolve(profiledata)
        })
    },
    deleteTheOrder:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).deleteOne({_id:objectId(orderId)}).then(()=>{
                resolve()
            })
        })
    },
    getAllCategory: () => {
        return new Promise(async (resolve, reject) => {
            let category = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
            resolve(category)
        })
    },
    deletePending: ()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).deleteOne({status:'pending'})
            resolve()
        })
    },
    converter: (price) => {
        return new Promise((resolve, reject) => {
         
            let currencyConverter = new CC({
              from: "INR",
              to: "USD",
              amount: price,
              isDecimalComma: false,
            });
          currencyConverter.convert().then((response) => {
           resolve(response)
          });
        });
     },
     stockManagement: (productData) => {
        return new Promise((resolve, reject) => {
          for (let i = 0; i < productData.length; i++) {
           // console.log(productData[i].quantity);
           // console.log(productData[i].item);
            db.get()
              .collection(collection.PRODUCT_COLLECTION)
              .updateOne( 
                { _id: objectId(productData[i].item) },
                { $inc: { Stock: -productData[i].quantity } }
              );
          }resolve()
        });
      },getCurrentOrder: (orderId)=>{
        return new Promise((resolve,reject)=>{
           let orders= db.get()
            .collection(collection.ORDER_COLLECTION)
            .findOne({_id:objectId(orderId)})
            resolve(orders)
        })
      },
      coupencheck: (userId, data) => {
       
        let response={}
        return new Promise(async (resolve, reject) => {
            let coupenn = await db.get().collection(collection.COUPON_COLLECTION).findOne({ name: data.coupen })
            console.log(coupenn);
            if (coupenn) {
                user = await db.get().collection(collection.COUPON_COLLECTION).findOne({ name: data.coupen, user: objectId(userId) })
                if (user) {
                    response.coupen=false
                    resolve(response)
                    console.log('failed');
                } else {
                    let date = new Date()
                    let expdate = new Date(coupenn.edate)
                    console.log(expdate);
                    if (date <= expdate) {
                        await db.get().collection(collection.COUPON_COLLECTION).updateOne(
                            {
                                name: data.coupen
                            },
                            {
                                $push: {
                                     user: objectId(userId)
                                    
                                }
                            })
                            response.coupenn = coupenn
                            response.coupen=true
                            resolve(response)
                    } else {
                        response.coupen=false
                        resolve(response)
                        console.log('expire');
                    }
                }

            }else{
                resolve(response.coupen=false)
                console.log('invalid coupen');
            }
        }
       )
    },
}
 
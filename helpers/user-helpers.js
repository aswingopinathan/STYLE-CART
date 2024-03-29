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
const niceInvoice = require("nice-invoice");

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
                response.status = true
                resolve(response)
            }
            // else if (mobile) {
            //     response.status = true
            //     resolve(response)
            // } 
            else {
                if(userData.referralcode){
                    let referralCheck = await db
                .get()
                .collection(collection.USER_COLLECTION)
                .findOne({ yourReferralCode: userData.referralcode })
            if (referralCheck) {
                userData.Password = await bcrypt.hash(userData.Password, 10)
                client.verify
                    .services(process.env.SERVICE_SID)
                    .verifications.create({
                        to: `+91${userData.Mobile}`,
                        channel: 'sms'
                    }).then((resp1) => {
                        console.log("response1", resp1);
                    })
                    resolve(response)
               }else{
                response.referral=true
                resolve(response)
               }
                }else{
                    userData.Password = await bcrypt.hash(userData.Password, 10)
                client.verify
                    .services(process.env.SERVICE_SID)
                    .verifications.create({
                        to: `+91${userData.Mobile}`,
                        channel: 'sms'
                    }).then((resp1) => {
                        console.log("response1", resp1);
                    })
                    resolve(response)
                }
               
            }
        })
    },
    resendOtp: (userData) => {
        return new Promise((resolve, reject) => {
            client.verify
                .services(process.env.SERVICE_SID)
                .verifications.create({
                    to: `+91${userData.Mobile}`,
                    channel: 'sms'
                }).then((resp1) => {
                    console.log("response1", resp1);
                })
            resolve(response)
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
                            let wallObj = {
                                userId: objectId(data.insertedId),
                                wallet: parseInt(0)
                            }
                            db.get().collection(collection.WALLET_COLLECTION).insertOne(wallObj)
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
                //schema
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then(() => {
                    resolve()
                })
            }
        })
    },
    addToWishlist: (proId, userId) => {
        let proObj = {
            item: objectId(proId)
        }
        return new Promise(async (resolve, reject) => {
            let userWishlist = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ user: objectId(userId) })
            if (userWishlist) {
                let proExist = userWishlist.products.findIndex(product => product.item == proId)
                console.log(proExist);
                if (proExist != -1) {
                    response.exist = true
                    resolve(response)
                } else {
                    db.get().collection(collection.WISHLIST_COLLECTION)
                        .updateOne({ user: objectId(userId) },
                            {
                                $push: { products: proObj }
                            }).then(() => {
                                response.status = true
                                resolve(response)
                            })
                }
            } else {
                //schema
                let wishlistObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.WISHLIST_COLLECTION).insertOne(wishlistObj).then(() => {
                    response.status = true
                    resolve(response)
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
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }, Brands: '$Brands.Name'
                    }
                }
            ]).toArray()
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
    getWishlistProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let wishlistItems = await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item'
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
                        item: 1, product: { $arrayElemAt: ['$product', 0] }, Brands: '$Brands.Name'
                    }
                }
            ]).toArray()
            resolve(wishlistItems)
        })
    },
    changeProductQuantity: (details) => {
        return new Promise(async (resolve, reject) => {
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(details.product) })
            details.quantity = details.quantity + 1
            product.Stock = parseInt(product.Stock)
            if (details.count == 1) {
                if (details.quantity > product.Stock) {
                    response.outofstock = true
                    resolve(response)
                } else {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                            {
                                $inc: { 'products.$.quantity': details.count }
                            }).then((response) => {
                                response.outofstock = false
                                response.normal = true
                                resolve(response)
                            })
                }
            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': details.count }
                        }).then((response) => {
                            response.outofstock = false
                            response.normal = true
                            resolve(response)
                        })
            }
        })
    },
    removeQuantity: (details) => {
        return new Promise((resolve, reject) => {
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
    deleteWishlistProduct: (wishlistId, proId) => {
        return new Promise((resolve, reject) => {
            db.get()
                .collection(collection.WISHLIST_COLLECTION)
                .updateOne({ _id: objectId(wishlistId) },
                    {
                        $pull: { products: { item: objectId(proId) } }
                    }).then((response) => {
                        response.removed = true
                        resolve(response)
                    })
        })
    },
    deleteWishlistProduct1: (userId, proId) => {
        return new Promise((resolve, reject) => {
            db.get()
                .collection(collection.WISHLIST_COLLECTION)
                .updateOne({ user: objectId(userId) },
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
    placeOrder: (order, products, total, discount) => {
        return new Promise(async (resolve, reject) => {
            console.log(order, products, total);
            let status = order['payment-method'] === 'COD' ? 'Order Confirmed' : 'pending'
            let addressFinder = await db.get().collection(collection.ADDRESS_COLLECTION).findOne({ _id: objectId(order.address) })
            let orderObj = {
                deliveryDetails: {
                    name: addressFinder.name,
                    mobile: addressFinder.mobile,
                    pincode: addressFinder.pincode,
                    locality: addressFinder.locality,
                    state: addressFinder.state,
                    address: addressFinder.address
                },
                userId: objectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                status: status,
                date: new Date(),
                date1: new Date().toDateString(),
                cancel: false,
                discountamount: discount

            }
            await db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                console.log('order id:' + response.insertedId);
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
    getUserOrders: (userId,pageno=1,limit=10) => {

         pageno = parseInt(pageno)
         limit = parseInt(limit)
        let skip = limit * (pageno - 1)    
        if (skip <= 0) skip = 0;
        console.log("skip,limit", skip, limit)

        return new Promise(async (resolve, reject) => {
            console.log(userId);
            let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { userId: objectId(userId) }
                },
                {
                    $sort: {
                        date: -1   
                    }    
                }

            ]).skip(skip).limit(limit).toArray()

            orders.pageno = pageno
            orders.count = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ userId: objectId(userId) }).count()
            orders.count = Math.ceil(orders.count / limit)
            orders.pageNos = []
            if (orders.count < 1) {
                orders.pageNos = [{ pageno: 1, currentPage: true }]
            } else {
                for (i = 1; i <= orders.count; i++) {
                    if (pageno == i) {
                        orders.pageNos.push({
                            pageno: i,
                            currentPage: true
                        })
                    } else {
                        orders.pageNos.push({
                            pageno: i,
                            currentPage: false
                        })
                    }
                }
            }
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
                    $project: {
                        Name: '$product.Name',
                        Category: '$product.Category',
                        Brands: '$product.Brands',
                        SubCategory: '$product.SubCategory',
                        Images: '$product.Images',
                        Price: '$product.Price',
                        quantity: 1
                    }
                },
                {
                    $lookup: {
                        from: collection.CATEGORY_COLLECTION,
                        localField: 'Category',
                        foreignField: '_id',
                        as: 'Category'
                    }
                },
                {
                    $lookup: {
                        from: collection.SUB_CATEGORY_COLLECTION,
                        localField: 'SubCategory',
                        foreignField: '_id',
                        as: 'SubCategory'
                    }
                },
                {
                    $lookup: {
                        from: collection.BRAND_COLLECTION,
                        localField: 'Brands',
                        foreignField: '_id',
                        as: 'Brands'
                    }
                },
                {
                    $unwind: '$Images'
                },
                {
                    $project: {
                        product: { $arrayElemAt: ['$product', 0] },
                        Name: 1,
                        Category: '$Category.Name',
                        SubCategory: '$SubCategory.Name',
                        Brands: '$Brands.Name',
                        Images: 1,
                        Price: 1,
                        quantity: 1
                    }
                }
            ]).toArray()
            resolve(orderItems)
        })
    },
    generateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            instance.orders.create({
                amount: total * 100,
                currency: "INR",
                receipt: "" + orderId,
                notes: {
                    key1: "value3",
                    key2: "value2"
                }
            }, function (err, order) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("New Order :", order);
                    resolve(order)
                }
            })
        })
    },
    verifyPayment: (details) => {
        return new Promise(async (resolve, reject) => {
            const {
                createHmac
            } = await import('node:crypto');
            let hmac = createHmac('sha256', process.env.KEY_SECRET);
            hmac.update(details['payment[razorpay_order_id]'] + "|" + details['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },
    generatePaypal: (orderId, total) => {
        return new Promise((resolve, reject) => {
            var create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": "http://localhost:3000/success/" + orderId,
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
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({ _id: objectId(orderId) },
                    {
                        $set: {
                            status: 'Order Confirmed'
                        }
                    }
                ).then(() => {
                    resolve()
                })
        })
    },
    cartClearing: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(proId) })
            resolve()
        })
    },
    cancelOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({ _id: objectId(orderId) },
                    {
                        $set: {
                            status: 'cancelled', cancel: true
                        }
                    }).then((response) => {
                        resolve(response)
                    })
        })
    },
    returnItem: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({ _id: objectId(orderId) },
                    {
                        $set: {
                            status: 'Returned', cancel: true
                        }
                    }).then((response) => {
                        resolve(response)
                    })
        })
    },
     changePassword: (passData, userId) => {

        return new Promise(async (resolve, reject) => {
            newPassword = await bcrypt.hash(passData.Password, 10)
            db.get().collection(collection.USER_COLLECTION)
                .updateOne({ _id: objectId(userId) },
                    {
                        $set: {
                            Password: newPassword
                        }
                    }).then(() => {
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
    addNewAddress: (body, userId) => {
        let addressObj = {
            userId: objectId(userId),
            name: body.name,
            mobile: body.mobile,
            pincode: body.pincode,
            state: body.state,
            address: body.address,
            locality: body.locality,
        };
        return new Promise((resolve, reject) => {
            db.get()
                .collection(collection.ADDRESS_COLLECTION)
                .insertOne(addressObj)
                .then(() => {
                    resolve(response);
                });
        });
    },
    getAddress: (usrId) => {
        return new Promise(async (resolve, reject) => {
            let userAddress = await db.get().collection(collection.ADDRESS_COLLECTION).aggregate([
                {
                    $match: { userId: objectId(usrId) }
                }
            ]).toArray()
            resolve(userAddress)
        })
    }, editProfile: (body, userId) => {
        console.log(body);
        console.log(userId);
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                $set: {
                    Username: body.Username,
                    Email: body.Email,
                    Mobile: body.Mobile
                }
            }).then(() => {
                console.log("ok updated");
                resolve()
            })
        })
    }, getProfile: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) }).then((response) => {
                resolve(response)
            })
        })
    },
    getWallet: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.WALLET_COLLECTION).findOne({ userId: objectId(userId) }).then((response) => {
                resolve(response)
            })
        })
    },
    deleteTheOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).deleteOne({ _id: objectId(orderId) }).then(() => {
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
    getAllSubCategory: () => {
        return new Promise(async (resolve, reject) => {
            let subCategory = await db.get().collection(collection.SUB_CATEGORY_COLLECTION).find().toArray()
            resolve(subCategory)
        })
    },
    deletePending: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).deleteOne({ status: 'pending' })
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
                db.get()
                    .collection(collection.PRODUCT_COLLECTION)
                    .updateOne(
                        { _id: objectId(productData[i].item) },
                        { $inc: { Stock: -productData[i].quantity } }
                    );
            } resolve()
        });
    }, getCurrentOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            let orders = db.get()
                .collection(collection.ORDER_COLLECTION)
                .findOne({ _id: objectId(orderId) })
            resolve(orders)
        })
    },
    couponCheck: (userId, body) => {
        let response = {}
        return new Promise(async (resolve, reject) => {
            let couponcode = await db.get().collection(collection.COUPON_COLLECTION).findOne({ couponname: body.coupon })
            console.log("couponcode", couponcode);
            if (couponcode) {
                let user = await db.get().collection(collection.COUPON_COLLECTION).findOne({ couponname: body.coupon, user: objectId(userId) })
                if (user) {
                    response.coupon = false
                    response.usedcoupon = true
                    console.log('coupon already used');
                    resolve(response)
                } else {
                    let currentDate = new Date()
                    let endDate = new Date(couponcode.enddate)
                    if (currentDate <= endDate) {
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
                        console.log("TOTAL AMOUNT", total);
                        let total1 = total[0].total
                        console.log("TOTAL1 AMOUNT", total1);
                        if (total1 >= couponcode.lowercap && total1 <= couponcode.uppercap) {
                            response.discountamount = (couponcode.percentage * total1) / 100
                            response.grandtotal = total1 - response.discountamount
                            response.total1 = total1
                            response.coupon = true
                            console.log("discount", response.discountamount);
                            console.log("grandtotal", response.grandtotal);
                            resolve(response)
                        } else {
                            response.small = true
                            resolve(response)
                        }
                    } else {
                        response.expired = true
                        console.log('coupon expired');
                        resolve(response)
                    }
                }
            } else {
                console.log('invalid coupon');
                resolve(response)
            }
        }
        )
    },
    userAppliedCoupon: (userId, coupon) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).updateOne(
                {
                    couponname: coupon
                },
                {
                    $push: {
                        user: objectId(userId)

                    }
                })
            resolve()
        })
    },
    getCap: (body) => {
        return new Promise(async (resolve, reject) => {
            let coupondetails = await db.get().collection(collection.COUPON_COLLECTION).findOne({ couponname: body.coupon })
            resolve(coupondetails)
        })
    },
    getDeliveryStatus: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let deliveryvalue = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(orderId) })
            resolve(deliveryvalue.status)
        })
    },
    referralUpdate: (userData) => {
        return new Promise(async (resolve, reject) => {
            let referralCheck = await db
                .get()
                .collection(collection.USER_COLLECTION)
                .findOne({ yourReferralCode: userData.referralcode })
            if (referralCheck) {
                userId = referralCheck._id
                await db
                    .get()
                    .collection(collection.WALLET_COLLECTION)
                    .updateOne({ userId: objectId(userId) }, { $inc: { wallet: 1000 } })
            }
            resolve()
        })
    },
    cancelAmountWallet: (userId, total) => {
        total = parseInt(total)
        return new Promise((resolve, reject) => {
            db.get().collection(collection.WALLET_COLLECTION)
                .updateOne({ userId: objectId(userId) }, { $inc: { wallet: total } })
            resolve()
        })
    },
    updateWalletCredit: (userId, orderId, totalPrice, walletAction) => {
        return new Promise((resolve, reject) => {
            let walletHistory = {
                order: objectId(orderId),
                status: "credited",
                amount: totalPrice,
                date1: new Date().toDateString(),
                action: walletAction
            }
            db.get().collection(collection.WALLET_COLLECTION)
                .updateOne({ userId: objectId(userId) }, { $push: { walletHistory: walletHistory } })
            resolve()
        })
    },
    updateWalletCreditReferral: (userData, walletAction) => {
        totalPrice = parseInt(1000)
        return new Promise(async (resolve, reject) => {
            let referralCheck = await db
                .get()
                .collection(collection.USER_COLLECTION)
                .findOne({ yourReferralCode: userData.referralcode })
            if (referralCheck) {
                userId = referralCheck._id
                let walletHistory = {
                    order: "referral",
                    status: "credited",
                    amount: totalPrice,
                    date1: new Date().toDateString(),
                    action: walletAction
                }
                await db.get().collection(collection.WALLET_COLLECTION)
                    .updateOne({ userId: objectId(userId) }, { $push: { walletHistory: walletHistory } })
            }
            resolve()
        })
    },
    getWalletBalance: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.WALLET_COLLECTION)
                .findOne({ userId: objectId(userId) }).then((response) => {
                    response = response.wallet
                    resolve(response)
                })
        })
    },
    updateWallet: (userId, walletMoney, orderId, totalPrice) => {
        totalPrice = parseInt(totalPrice)
        let walletHistory = [{
            order: objectId(orderId),
            status: "debited",
            amount: totalPrice,
            date1: new Date().toDateString(),
            action: "Product purchase"
        }]
        return new Promise((resolve, reject) => {
            db.get().collection(collection.WALLET_COLLECTION)
                .updateOne({ userId: objectId(userId) },
                    {
                        $set: {
                            wallet: walletMoney,
                            walletHistory: walletHistory
                        }
                    }
                ).then(() => {
                    resolve()
                })
        })
    },
    increaseStock: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(orderId) })
            let productData = order.products
            for (let i = 0; i < productData.length; i++) {
                db.get()
                    .collection(collection.PRODUCT_COLLECTION)
                    .updateOne(
                        { _id: objectId(productData[i].item) },
                        { $inc: { Stock: productData[i].quantity } }
                    );
            } resolve()
        });
    },
    getSpecificAddress: (addressId) => {
        return new Promise(async (resolve, reject) => {
            let userAddress = await db.get().collection(collection.ADDRESS_COLLECTION).findOne({ _id: objectId(addressId) })
            resolve(userAddress)
        })
    },
    editAddress: (body, addressId) => {
        return new Promise((resolve, reject) => {
            db.get()
                .collection(collection.ADDRESS_COLLECTION)
                .updateOne({ _id: objectId(addressId) }, {
                    $set: {
                        name: body.name,
                        mobile: body.mobile,
                        pincode: body.pincode,
                        state: body.state,
                        address: body.address,
                        locality: body.locality
                    }
                })
            resolve()
        })
    },
    deleteAddress: (addressId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADDRESS_COLLECTION).deleteOne({ _id: objectId(addressId) })
            resolve()
        })
    },

    downloadInvoice: (products, orders, user) => {
        let data = [];
        products.map(async (pro) => {
            data = {
                item: pro.Name[0],
                // description: pro.Category[0],
                description: '',
                quantity: pro.quantity,
                price: pro.Price[0],
                tax: '0%',
            };
        });
        return new Promise((resolve, reject) => {
            const invoiceDetail = {
                shipping: {
                    name: orders.deliveryDetails.name,
                    address: orders.deliveryDetails.address,
                    city: orders.deliveryDetails.locality,
                    state: orders.deliveryDetails.state,
                    country: 'India',
                    postal_code: orders.deliveryDetails.pincode,
                },
                items: [data],
                subtotal: orders.totalAmount,
                total: orders.totalAmount,
                order_number: orders._id,
                header: {
                    company_name: 'Style cart',
                    company_logo: 'logo.png',
                    company_address: 'Room No:16 Unknown Building Cochin',
                },
                footer: {
                    text: 'Thank you for purchasing from style cart',
                },
                currency_symbol: '₹',
                date: {
                    billing_date: orders.date1,
                    due_date: orders.date1,
                },
            };

            niceInvoice(invoiceDetail, user.Username + orders._id + '.pdf');
            resolve()
        });
    },
    getWalletDetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            let wallet = await db.get().collection(collection.WALLET_COLLECTION).findOne({ userId: objectId(userId) })
            resolve(wallet)
        })
    },
    wishCheck: (userId) => {
        return new Promise(async(resolve,reject)=>{
            let wishcheck = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ user: objectId(userId)})
            resolve(wishcheck)
        })
    },
    changeDeliveryStatus: (orderId, status) => {
        return new Promise((resolve, reject) => {
            db.get()
                .collection(collection.ORDER_COLLECTION)
                .updateOne({ _id: objectId(orderId) },
                    {
                        $set: { status: status }
                    })
            resolve()
        })
    }
}

var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
var adminHelpers = require('../helpers/admin-helper');
var multer = require("multer");
const { response } = require('express');

let userName = "admin@gmail.com"
let Pin = "1234"

/* GET users listing. */

const verifyAdminLogin = (req, res, next) => {
  if (req.session.isadmin) {
    next()
  } else {
    res.redirect('/admin')
  }
}

router.get('/', function (req, res, next) {
  try{

  }catch(error)
  {
  
  }
  if (req.session.isadmin) {
    res.redirect('/admin/adminindex')
  } else {
    res.render('admin/admin-login', { errout: req.session.err });
  }
});

let yearValue=2022;
router.get('/adminindex',verifyAdminLogin,async function (req, res, next) {
  // console.log("yearValuechange2",yearValue);


    let cod = await adminHelpers.getPaymentMethodNums('COD')
    let razorpay = await adminHelpers.getPaymentMethodNums('ONLINE-RAZOR')
    let paypal = await adminHelpers.getPaymentMethodNums('ONLINE-PAYPAL')
    let wallet = await adminHelpers.getPaymentMethodNums('WALLET')

    let chartData= await adminHelpers.getChartData(yearValue)

    let monthlySalesReport= await adminHelpers.getMonthlySalesReport(yearValue)

    let listedYears= await adminHelpers.getYear()

    let userCount=   await adminHelpers.getUserCount()

    // console.log("yearlySalesReport",yearlySalesReport); 
    res.render('admin/index', { admin: true,cod, razorpay, paypal,wallet,chartData,monthlySalesReport,yearValue,listedYears,userCount});
});

router.get('/sales-monthly',async(req,res)=>{
  let monthlySalesReport= await adminHelpers.getMonthlySalesReport(yearValue)

  res.render('admin/sales-monthly',{admin: true,monthlySalesReport})
})
 
router.post('/adminindex', (req, res, next) => {
  const { Email, Password } = req.body;
  if (userName === Email && Pin === Password) {
    req.session.isadmin = userName
    req.session.err = null
    console.log("admin session created");
    res.redirect('/admin/adminindex')
  }
  else { 
    req.session.err = "Invalid Credential"
    res.redirect('/admin')
  }
})

router.get('/show-user',verifyAdminLogin, (req, res, next) => {
  adminHelpers.getAllUsers().then((users) => {
    res.render('admin/show-user', { admin: true, users })
  })
})

router.get('/show-products',verifyAdminLogin, (req, res, next) => {
  productHelpers.getAllProducts().then((products) => {
    res.render('admin/show-products', { admin: true, products })
  })
})

router.get('/add-product',verifyAdminLogin, async function (req, res, next) {
  let getcategory = await adminHelpers.getAllCategory()
  let getsubcategory = await adminHelpers.getAllSubCategory()
  let brands = await adminHelpers.getAllBrands()
  res.render('admin/add-product', { admin: true, getcategory, getsubcategory, brands });
});

//multer
const filestorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/product-images')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '--' + file.originalname)
  }
})

const upload = multer({ storage: filestorageEngine })
router.post('/add-product', upload.array('Images'), (req, res) => {
  var filenames = req.files.map(function (file) {
    return file.filename;
  });
  req.body.Images = filenames;
  productHelpers.addproduct(req.body).then(()=> {
    console.log(req.body);
    res.redirect('/admin/show-products')
  })
})

//multer


  router.get('/edit-product/:id',verifyAdminLogin, async (req, res) => {
    try{
    let editproduct = await productHelpers.getproductDetails(req.params.id)
    let getcategory = await adminHelpers.getAllCategory()
    let getsubcategory = await adminHelpers.getAllSubCategory()
    let getbrands = await adminHelpers.getAllBrands()
    res.render('admin/edit-product', { admin: true, editproduct, getcategory, getsubcategory, getbrands })
  }catch{
    res.render('/admin/page404')
  }
  })


router.post('/edit-product/:id', upload.array('Images', 4), (req, res) => {
  console.log("pass");
  var filenames = req.files.map(function (file) {
    return file.filename;
  });
  req.body.Images = filenames;
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin/show-products')
  }) 
}) 

router.get('/delete-product/:id',verifyAdminLogin, (req, res) => {
  let proId = req.params.id
  console.log(proId);
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/show-products')
  })
})

//user blocking
router.get('/block/:id',verifyAdminLogin, (req, res) => {
  var userId = req.params.id;
  adminHelpers.blockUser(userId).then(() => {
    res.redirect('/admin/show-user')
  })
})

//user unblocking
router.get('/unblock/:id',verifyAdminLogin, (req, res) => {
  var userId = req.params.id;
  adminHelpers.unblockUser(userId).then(() => {
    res.redirect('/admin/show-user')
  })
})

router.get('/show-category',verifyAdminLogin, (req, res) => {
  adminHelpers.getAllCategory().then((category) => {
    res.render('admin/show-category', { admin: true, category })
  })
})

router.get('/add-category',verifyAdminLogin, (req, res) => {
  res.render('admin/add-category', { admin: true })
})

router.post('/add-category', (req, res) => {
  adminHelpers.addCategory(req.body).then(() => {
    res.redirect('/admin/show-category')
  })
})

router.get('/delete-category/:id',verifyAdminLogin, (req, res) => {
  let catId = req.params.id
  adminHelpers.deleteCategory(catId).then(() => {
    res.redirect('/admin/show-category')
  })
})

router.get('/show-sub-category',verifyAdminLogin, (req, res) => {
  adminHelpers.getAllSubCategory().then((subcategory) => {
    res.render('admin/show-sub-category', { admin: true, subcategory })
  })
})

router.get('/add-sub-category',verifyAdminLogin, (req, res) => {
  res.render('admin/add-sub-category', { admin: true })
})

router.post('/add-sub-category', (req, res) => {
  adminHelpers.addSubCategory(req.body).then(() => {
    res.redirect('/admin/show-sub-category')
  })
})

router.get('/delete-sub-category/:id',verifyAdminLogin, (req, res) => {
  let subId = req.params.id
  adminHelpers.deleteSubCategory(subId).then(() => {
    res.redirect('/admin/show-sub-category')
  })
})

//brands section start
router.get('/show-brands',verifyAdminLogin, (req, res) => {
  adminHelpers.getAllBrands().then((brands) => {
    res.render('admin/show-brands', { admin: true, brands })
  })
})

router.get('/add-brands',verifyAdminLogin, (req, res) => {
  res.render('admin/add-brands', { admin: true })
})

router.post('/add-brands', (req, res) => {
  adminHelpers.addBrands(req.body).then(() => {
    res.redirect('/admin/show-brands')
  })
})

router.get('/delete-brands/:id',verifyAdminLogin, (req, res) => {
  let brandId = req.params.id
  console.log(brandId);
  adminHelpers.deleteBrands(brandId).then(() => {
    res.redirect('/admin/show-brands')
  })
})
//brands section end

//orders section start
//working
router.get('/show-orders',verifyAdminLogin, (req, res) => {
  adminHelpers.getAllOrders().then((orders) => {
    res.render('admin/show-orders', { admin: true,order:orders })
  })
}) 

router.get('/view-order-products/:id',verifyAdminLogin,async(req,res)=>{
  console.log(req.params.id);
  let products=await adminHelpers.getOrderProductsAdmin(req.params.id)
  let orders=await adminHelpers.getCurrentOrderAdmin(req.params.id)
  let deliverystatusadmin = await adminHelpers.getDeliveryStatusAdmin(req.params.id)
  console.log("products",products);
  res.render('admin/view-order-products',{admin:true,products,orders,deliverystatusadmin})
})
//orders section end

router.get('/logout', (req, res) => {
  req.session.isadmin = null
  console.log("admin session destroyed");
  res.redirect('/admin')
})
//admin cancel fund to wallet no userid

router.post('/admin-cancel-order',async(req,res)=>{
  if(req.body.payment!= "COD"){
    await adminHelpers.AdminCancelAmountWallet(req.body.userId,req.body.amount)
    await adminHelpers.adminIncreaseStock(req.body.order)
    await adminHelpers.adminCancelOrder(req.body.order).then((response)=>{
      res.json(response)
    })
  }else{
    await adminHelpers.adminCancelOrder(req.body.order).then((response)=>{
      res.json(response)
    })
  }
})
///admin cancel fund return to wallet

router.get('/show-banner',verifyAdminLogin,(req,res)=>{
  adminHelpers.getAllBanner().then((banner)=>{
    res.render('admin/show-banner',{admin:true,banner})
  })
})

router.get('/add-banner',verifyAdminLogin,(req,res)=>{
res.render('admin/add-banner',{admin:true}) 
})

router.post('/add-banner', upload.array('Images'), (req, res) => {
  var filenames = req.files.map(function (file) {
    return file.filename;
  });
  req.body.Images = filenames;
  adminHelpers.addBanner(req.body).then(()=> {
    res.redirect('/admin/show-banner')
  })
})

router.get('/delete-banner/:id',verifyAdminLogin, (req, res) => {
  let banner = req.params.id
  adminHelpers.deleteBanner(banner).then(() => {
    res.redirect('/admin/show-banner')
  })
})

//testing
router.get('/sample',(req,res)=>{
  res.render('admin/page404')
})


//coupon section
router.get('/show-coupon',verifyAdminLogin, (req, res) => {
  adminHelpers.getAllCoupon().then((coupon) => {
    res.render('admin/show-coupon', { admin: true, coupon })
  })
})

router.get('/add-coupon',verifyAdminLogin, (req, res) => {
  res.render('admin/add-coupon', { admin: true })
})

router.post('/add-coupon', (req, res) => {
  adminHelpers.addCoupon(req.body).then(() => {
    res.redirect('/admin/show-coupon')
  })
})

router.get('/delete-coupon/:id',verifyAdminLogin, (req, res) => {
  let couponId = req.params.id
  adminHelpers.deleteCoupon(couponId).then(() => {
    res.redirect('/admin/show-coupon')
  })
})

//offercategory//working
router.get('/show-offer-category',verifyAdminLogin,async (req, res) => {
 let category= await adminHelpers.getAllCategory()
 res.render('admin/show-offer-category', { admin: true,category })
})

router.get('/add-offer-category/:id',verifyAdminLogin, (req, res) => {
  req.session.catId=req.params.id
  res.render('admin/add-offer-category', { admin: true }) 
})

router.post('/add-offer-category', (req, res) => {
  adminHelpers.addOfferCategory(req.body, req.session.catId).then(() => {
    res.redirect('/admin/show-offer-category')
  })
})

router.post('/change-status',(req,res)=>{
  adminHelpers.changeDeliveryStatus(req.body.order,req.body.status).then(()=>{
    res.json(response)
  }) 
})

router.post('/offer-activate',(req,res)=>{
  newoffer=req.body.offer
  adminHelpers.changeOfferStatus(req.body.categoryId,newoffer).then((response)=>{
    adminHelpers.activateCategoryOffer(req.body.categoryId)
    res.json(response)
  })
})

router.post('/offer-deactivate',(req,res)=>{
  newoffer=req.body.offer
  adminHelpers.changeOfferStatus(req.body.categoryId,newoffer).then((response)=>{
    adminHelpers.deactivateCategoryOffer(req.body.categoryId)
    res.json(response)
  })
})

router.post('/change-year',(req,res)=>{
  yearValue=req.body.year
  console.log("yearValuechange",yearValue);
  res.json(response)
})

router.get('/sample1',async(req,res)=>{
  // let salesReport= await adminHelpers.getReportData()
  // console.log("salesReport",salesReport); 
  // await adminHelpers.getYear()
  // await adminHelpers.getUserCount()

  res.send("ok")
})
 

module.exports = router;

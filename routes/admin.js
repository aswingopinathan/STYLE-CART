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
    if (req.session.isadmin) {
      res.redirect('/admin/adminindex')
    } else {
      res.render('admin/admin-login', { errout: req.session.err });
    }
  }catch(error)
  {
    console.log(error); 
  res.render('admin/page404')
  }
});

let yearValue=2022;
router.get('/adminindex',verifyAdminLogin,async function (req, res, next) {
try{
  let cod = await adminHelpers.getPaymentMethodNums('COD')
  let razorpay = await adminHelpers.getPaymentMethodNums('ONLINE-RAZOR')
  let paypal = await adminHelpers.getPaymentMethodNums('ONLINE-PAYPAL')
  let wallet = await adminHelpers.getPaymentMethodNums('WALLET')

  let chartData= await adminHelpers.getChartData(yearValue)

  let monthlySalesReport= await adminHelpers.getMonthlySalesReport(yearValue)

  let listedYears= await adminHelpers.getYear()

  let userCount=   await adminHelpers.getUserCount()

  let productCount=   await adminHelpers.getProductCount()

  let ordersCount=   await adminHelpers.getOrdersCount()

  let totalRevenue= await adminHelpers.getTotalRevenue()

  res.render('admin/index', { admin: true,cod, razorpay, paypal,wallet,chartData,monthlySalesReport,yearValue,listedYears,userCount,productCount,ordersCount,totalRevenue});
}catch(error){
  console.log(error); 
  res.render('admin/page404')
}
});

 
router.post('/adminindex', (req, res, next) => {
  try{
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
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/show-user',verifyAdminLogin, (req, res, next) => {
  try{
    adminHelpers.getAllUsers().then((users) => {
      res.render('admin/show-user', { admin: true, users })
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/show-products',verifyAdminLogin, (req, res, next) => {
  try{
    productHelpers.getAllProducts().then((products) => {
      res.render('admin/show-products', { admin: true, products })
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/add-product',verifyAdminLogin, async function (req, res, next) {
  try{
    let getcategory = await adminHelpers.getAllCategory()
  let getsubcategory = await adminHelpers.getAllSubCategory()
  let brands = await adminHelpers.getAllBrands()
  res.render('admin/add-product', { admin: true, getcategory, getsubcategory, brands });
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
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
  try{
    var filenames = req.files.map(function (file) {
      return file.filename;
    });
    req.body.Images = filenames;
    productHelpers.addproduct(req.body).then(()=> {
      console.log(req.body);
      res.redirect('/admin/show-products')
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
  
})

  router.get('/edit-product/:id',verifyAdminLogin, async (req, res) => {
    try{
    let editproduct = await productHelpers.getproductDetails(req.params.id)
    let getcategory = await adminHelpers.getAllCategory()
    let getsubcategory = await adminHelpers.getAllSubCategory()
    let getbrands = await adminHelpers.getAllBrands()
    res.render('admin/edit-product', { admin: true, editproduct, getcategory, getsubcategory, getbrands })
  }catch{
    console.log(error); 
  res.render('admin/page404')
  }
  })

router.post('/edit-product/:id', upload.array('Images', 4), (req, res) => {
  try{
    console.log("pass");
  var filenames = req.files.map(function (file) {
    return file.filename;
  });
  req.body.Images = filenames;
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin/show-products')
  }) 
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
}) 

router.get('/delete-product/:id',verifyAdminLogin, (req, res) => {
  try{
    let proId = req.params.id
  console.log(proId);
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/show-products')
  })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

//user blocking
router.get('/block/:id',verifyAdminLogin, (req, res) => {
  try{
    var userId = req.params.id;
  adminHelpers.blockUser(userId).then(() => {
    res.redirect('/admin/show-user')
  })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

//user unblocking
router.get('/unblock/:id',verifyAdminLogin, (req, res) => {
  try{
    var userId = req.params.id;
  adminHelpers.unblockUser(userId).then(() => {
    res.redirect('/admin/show-user')
  })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/show-category',verifyAdminLogin, (req, res) => {
  try{
    adminHelpers.getAllCategory().then((category) => {
      res.render('admin/show-category', { admin: true, category })
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/add-category',verifyAdminLogin, (req, res) => {
  try{
    res.render('admin/add-category', { admin: true })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.post('/add-category', (req, res) => {
  try{
    adminHelpers.addCategory(req.body).then(() => {
      res.redirect('/admin/show-category')
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/delete-category/:id',verifyAdminLogin, (req, res) => {
  try{
    let catId = req.params.id
  adminHelpers.deleteCategory(catId).then(() => {
    res.redirect('/admin/show-category')
  })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/show-sub-category',verifyAdminLogin, (req, res) => {
  try{
    adminHelpers.getAllSubCategory().then((subcategory) => {
      res.render('admin/show-sub-category', { admin: true, subcategory })
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/add-sub-category',verifyAdminLogin, (req, res) => {
  try{
    res.render('admin/add-sub-category', { admin: true })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.post('/add-sub-category', (req, res) => {
  try{
    adminHelpers.addSubCategory(req.body).then(() => {
      res.redirect('/admin/show-sub-category')
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/delete-sub-category/:id',verifyAdminLogin, (req, res) => {
  try{
    let subId = req.params.id
    adminHelpers.deleteSubCategory(subId).then(() => {
      res.redirect('/admin/show-sub-category')
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

//brands section start
router.get('/show-brands',verifyAdminLogin, (req, res) => {
  try{
    adminHelpers.getAllBrands().then((brands) => {
      res.render('admin/show-brands', { admin: true, brands })
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/add-brands',verifyAdminLogin, (req, res) => {
  try{
    res.render('admin/add-brands', { admin: true })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.post('/add-brands', (req, res) => {
  try{
    adminHelpers.addBrands(req.body).then(() => {
      res.redirect('/admin/show-brands')
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/delete-brands/:id',verifyAdminLogin, (req, res) => {
  try{
    let brandId = req.params.id
  console.log(brandId);
  adminHelpers.deleteBrands(brandId).then(() => {
    res.redirect('/admin/show-brands')
  })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/show-orders',verifyAdminLogin, (req, res) => {
  try{
    adminHelpers.getAllOrders().then((orders) => {
      res.render('admin/show-orders', { admin: true,order:orders })
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
}) 

router.get('/view-order-products/:id',verifyAdminLogin,async(req,res)=>{
  try{
    let products=await adminHelpers.getOrderProductsAdmin(req.params.id)
  let orders=await adminHelpers.getCurrentOrderAdmin(req.params.id)
  let deliverystatusadmin = await adminHelpers.getDeliveryStatusAdmin(req.params.id)
  console.log("products",products);
  res.render('admin/view-order-products',{admin:true,products,orders,deliverystatusadmin})
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/logout', (req, res) => {
  try{
    req.session.isadmin = null
    console.log("admin session destroyed");
    res.redirect('/admin')
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
 
})

router.post('/admin-cancel-order',async(req,res)=>{
  try{
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
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/show-banner',verifyAdminLogin,(req,res)=>{
  try{
    adminHelpers.getAllBanner().then((banner)=>{
      res.render('admin/show-banner',{admin:true,banner})
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/add-banner',verifyAdminLogin,(req,res)=>{
  try{
    res.render('admin/add-banner',{admin:true})
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.post('/add-banner', upload.array('Images'), (req, res) => {
  try{
    var filenames = req.files.map(function (file) {
      return file.filename;
    });
    req.body.Images = filenames;
    adminHelpers.addBanner(req.body).then(()=> {
      res.redirect('/admin/show-banner')
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

///working on 31wednesday
router.get('/edit-banner/:id',async(req,res)=>{
  let bannerDetails=await adminHelpers.getBannerDetails(req.params.id)
  res.render('admin/edit-banner',{admin:true,bannerDetails})
})

router.post('/delete-banner',verifyAdminLogin, (req, res) => {
  try{
    // let banner = req.params.id
  adminHelpers.deleteBanner(req.body.id).then(() => {
    res.redirect('/admin/show-banner')
  })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

//testing
router.get('/sample',(req,res)=>{
  res.render('admin/page404')
})

router.get('/show-coupon',verifyAdminLogin, (req, res) => {
  try{
    adminHelpers.getAllCoupon().then((coupon) => {
      res.render('admin/show-coupon', { admin: true, coupon })
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/add-coupon',verifyAdminLogin, (req, res) => {
  try{
    res.render('admin/add-coupon', { admin: true })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.post('/add-coupon', (req, res) => {
  try{
    adminHelpers.addCoupon(req.body).then(() => {
      res.redirect('/admin/show-coupon')
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/delete-coupon/:id',verifyAdminLogin, (req, res) => {
  try{
    let couponId = req.params.id
  adminHelpers.deleteCoupon(couponId).then(() => {
    res.redirect('/admin/show-coupon')
  })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/show-offer-category',verifyAdminLogin,async (req, res) => {
  try{
    let category= await adminHelpers.getAllCategory()
 res.render('admin/show-offer-category', { admin: true,category })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/add-offer-category/:id',verifyAdminLogin, (req, res) => {
  try{
    req.session.catId=req.params.id
  res.render('admin/add-offer-category', { admin: true }) 
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.post('/add-offer-category', (req, res) => {
  try{
    adminHelpers.addOfferCategory(req.body, req.session.catId).then(() => {
      res.redirect('/admin/show-offer-category')
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.post('/change-status',(req,res)=>{
  try{
    adminHelpers.changeDeliveryStatus(req.body.order,req.body.status).then(()=>{
      res.json(response)
    }) 
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.post('/offer-activate',(req,res)=>{
  try{
    newoffer=req.body.offer
    adminHelpers.changeOfferStatus(req.body.categoryId,newoffer).then((response)=>{
      adminHelpers.activateCategoryOffer(req.body.categoryId)
      res.json(response)
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.post('/offer-deactivate',(req,res)=>{
  try{
    newoffer=req.body.offer
    adminHelpers.changeOfferStatus(req.body.categoryId,newoffer).then((response)=>{
      adminHelpers.deactivateCategoryOffer(req.body.categoryId)
      res.json(response)
    })
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.post('/change-year',(req,res)=>{
  try{
    yearValue=req.body.year
  console.log("yearValuechange",yearValue);
  res.json(response)
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/sales-yearly',async(req,res)=>{
  try{
    let yearlySalesReport= await adminHelpers.getYearlySalesReport()
  res.render('admin/sales-yearly',{admin: true,yearlySalesReport,yearValue})
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/sales-weekly',async(req,res)=>{
  try{
    let weeklySalesReport= await adminHelpers.getWeeklySalesReport(yearValue )
  let listedYears= await adminHelpers.getYear()
  res.render('admin/sales-weekly',{admin: true,weeklySalesReport,listedYears,yearValue})
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
})

router.get('/sales-monthly',async(req,res)=>{
  try{
    let monthlySalesReport= await adminHelpers.getMonthlySalesReport(yearValue )
  let listedYears= await adminHelpers.getYear()
  res.render('admin/sales-monthly',{admin: true,monthlySalesReport,listedYears,yearValue})
  }catch(error){
    console.log(error); 
  res.render('admin/page404')
  }
  
})

module.exports = router;

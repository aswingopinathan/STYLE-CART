var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
var adminHelpers = require('../helpers/admin-helper');
var multer = require("multer");

let userName = "admin@gmail.com"
let Pin = "1234"

/* GET users listing. */

router.get('/', function (req, res, next) {
  if (req.session.isadmin) {
    res.redirect('/admin/adminindex')
  } else {
    res.render('admin/admin-login', { errout: req.session.err });
  }
});

router.get('/adminindex', function (req, res, next) {
  if (req.session.isadmin) {
    res.render('admin/index', { admin: true });
  } else {
    res.redirect('/admin')
  }
});

router.post('/adminindex', (req, res, next) => {
  const { Email, Password } = req.body;
  if (userName === Email && Pin === Password) {
    req.session.isadmin = userName
    req.session.check = true
    console.log("admin session created");
    res.redirect('/admin/adminindex')
  }
  else {
    req.session.err = "incorrect username or password"
    res.redirect('/admin')
  }
})

router.get('/show-user', (req, res, next) => {
  adminHelpers.getAllUsers().then((users) => {
    res.render('admin/show-user', { admin: true, users })
  })
})

router.get('/show-products', (req, res, next) => {
  productHelpers.getAllProducts().then((products) => {
    res.render('admin/show-products', { admin: true, products })
  })
})

router.get('/add-product', async function (req, res, next) {
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

router.get('/edit-product/:id', async (req, res) => {
  let editproduct = await productHelpers.getproductDetails(req.params.id)
  let getcategory = await adminHelpers.getAllCategory()
  let getsubcategory = await adminHelpers.getAllSubCategory()
  let getbrands = await adminHelpers.getAllBrands()
  res.render('admin/edit-product', { admin: true, editproduct, getcategory, getsubcategory, getbrands })
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

router.get('/delete-product/:id', (req, res) => {
  let proId = req.params.id
  console.log(proId);
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/show-products')
  })
})

//user blocking
router.get('/block/:id', (req, res) => {
  var userId = req.params.id;
  adminHelpers.blockUser(userId).then(() => {
    res.redirect('/admin/show-user')
  })
})

//user unblocking
router.get('/unblock/:id', (req, res) => {
  var userId = req.params.id;
  adminHelpers.unblockUser(userId).then(() => {
    res.redirect('/admin/show-user')
  })
})

router.get('/show-category', (req, res) => {
  adminHelpers.getAllCategory().then((category) => {
    res.render('admin/show-category', { admin: true, category })
  })
})

router.get('/add-category', (req, res) => {
  res.render('admin/add-category', { admin: true })
})

router.post('/add-category', (req, res) => {
  adminHelpers.addCategory(req.body).then(() => {
    res.redirect('/admin/show-category')
  })
})

router.get('/delete-category/:id', (req, res) => {
  let catId = req.params.id
  adminHelpers.deleteCategory(catId).then(() => {
    res.redirect('/admin/show-category')
  })
})

router.get('/show-sub-category', (req, res) => {
  adminHelpers.getAllSubCategory().then((subcategory) => {
    res.render('admin/show-sub-category', { admin: true, subcategory })
  })
})

router.get('/add-sub-category', (req, res) => {
  res.render('admin/add-sub-category', { admin: true })
})

router.post('/add-sub-category', (req, res) => {
  adminHelpers.addSubCategory(req.body).then(() => {
    res.redirect('/admin/show-sub-category')
  })
})

router.get('/delete-sub-category/:id', (req, res) => {
  let subId = req.params.id
  adminHelpers.deleteSubCategory(subId).then(() => {
    res.redirect('/admin/show-sub-category')
  })
})

//brands section start
router.get('/show-brands', (req, res) => {
  adminHelpers.getAllBrands().then((brands) => {
    res.render('admin/show-brands', { admin: true, brands })
  })
})

router.get('/add-brands', (req, res) => {
  res.render('admin/add-brands', { admin: true })
})

router.post('/add-brands', (req, res) => {
  adminHelpers.addBrands(req.body).then(() => {
    res.redirect('/admin/show-brands')
  })
})

router.get('/delete-brands/:id', (req, res) => {
  let brandId = req.params.id
  console.log(brandId);
  adminHelpers.deleteBrands(brandId).then(() => {
    res.redirect('/admin/show-brands')
  })
})
//brands section end

//orders section start
router.get('/show-orders', (req, res) => {
  adminHelpers.getAllOrders().then((orders) => {
    res.render('admin/show-orders', { admin: true,order:orders })
  })
})

router.get('/view-order-products/:id',async(req,res)=>{
  console.log(req.params.id);
  let products=await adminHelpers.getOrderProductsAdmin(req.params.id)
  console.log(products);
  res.render('admin/view-order-products',{admin:true,products})
})
//orders section end

router.get('/logout', (req, res) => {
  req.session.isadmin = null
  console.log("admin session destroyed");
  req.session.check = null
  res.redirect('/admin')
})

router.post('/admin-cancel-order',((req,res)=>{
  adminHelpers.adminCancelOrder(req.body.product).then((response)=>{
    res.json(response)
  })
}))

router.get('/show-banner',((req,res)=>{
  adminHelpers.getAllBanner().then((banner)=>{
    res.render('admin/show-banner',{admin:true,banner})
  })
}))

router.get('/add-banner',((req,res)=>{
res.render('admin/add-banner',{admin:true}) 
}))

router.post('/add-banner', upload.array('Images'), (req, res) => {
  var filenames = req.files.map(function (file) {
    return file.filename;
  });
  req.body.Images = filenames;
  adminHelpers.addBanner(req.body).then(()=> {
    console.log(req.body);
    res.redirect('/admin/show-banner')
  })
})

router.get('/delete-banner/:id', (req, res) => {
  let banner = req.params.id
  console.log("deleted banner"+banner);
  adminHelpers.deleteBanner(banner).then(() => {
    res.redirect('/admin/show-banner')
  })
})

router.get('/sample',(req,res)=>{
  res.render('admin/sample',{admin:true})
})



module.exports = router;

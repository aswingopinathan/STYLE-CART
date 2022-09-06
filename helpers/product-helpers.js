var db = require('../config/connection')
var collection = require('../config/collections');
var objectId = require('mongodb').ObjectId
var Handlebars = require('handlebars');

Handlebars.registerHelper("inc", function (value, options) {
    return parseInt(value) + 1;
});

module.exports = {
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
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
                        from: collection.BRAND_COLLECTION,
                        localField: 'Brands',
                        foreignField: '_id',
                        as: 'Brands'
                    },
                },
                {
                    $lookup: {
                        from: collection.SUB_CATEGORY_COLLECTION,
                        localField: 'SubCategory',
                        foreignField: '_id',
                        as: 'SubCategory',
                    },
                },
                {
                    $project: {
                        Name: 1,
                        Category: '$Category.Name',
                        Brands: '$Brands.Name',
                        SubCategory: '$SubCategory.Name',
                        Stock: 1,
                        Price: 1,
                        Description: 1,
                        Images: 1
                    }
                }
            ]).toArray()
            resolve(products)
        })
    },
    addproduct: (body) => {
        Stock = parseInt(body.Stock)
        body.Stock = Stock
        return new Promise(async (resolve, reject) => {
            let Category = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ Name: body.Category })
            console.log(Category);
            let SubCategory = await db.get().collection(collection.SUB_CATEGORY_COLLECTION).findOne({ Name: body.SubCategory })
            console.log(SubCategory);
            let Brands = await db.get().collection(collection.BRAND_COLLECTION).findOne({ Name: body.Brands })
            console.log(Brands);
            let proObj = {
                Name: body.Name,
                Category: objectId(Category._id),
                Brands: objectId(Brands._id),
                SubCategory: objectId(SubCategory._id),
                Stock: body.Stock,
                Price: parseInt(body.Price) ,
                Cutprice: parseInt(body.Cutprice) ,
                Description: body.Description,
                Images: body.Images,
                discountpercentage: ["5"],
                offername: [""]

            }
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne(proObj).then(() => {
                resolve()
            })
        })
    },
    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId(proId) }).then(() => {
                resolve()
            })
        })
    },
    getproductDetails: (proId) => {
        return new Promise(async (resolve, reject) => {
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(proId) }
                },
                {
                    $project: {
                        Name: 1,
                        Category: 1,
                        SubCategory: 1,
                        Brands: 1,
                        Stock: 1,
                        Price: 1,
                        Description: 1,
                        Images: 1,
                        Cutprice:1
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
                        from: collection.BRAND_COLLECTION,
                        localField: 'Brands',
                        foreignField: '_id',
                        as: 'Brands'
                    },
                },
                {
                    $lookup: {
                        from: collection.SUB_CATEGORY_COLLECTION,
                        localField: 'SubCategory',
                        foreignField: '_id',
                        as: 'SubCategory',
                    },
                },
                {
                    $project: {
                        Name: 1,
                        Category: '$Category.Name',
                        Brands: '$Brands.Name',
                        SubCategory: '$SubCategory.Name',
                        Stock: 1,
                        Price: 1,
                        Description: 1,
                        Images: 1,
                        Cutprice:1
                    }
                }
            ]).toArray()
            console.log("product1",product);
            resolve(product)
        })
    },
    updateProduct: (proId, proDetails) => {
        return new Promise(async (resolve, reject) => {
            let Category = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ Name: proDetails.Category })
            let SubCategory = await db.get().collection(collection.SUB_CATEGORY_COLLECTION).findOne({ Name: proDetails.SubCategory })
            let Brands = await db.get().collection(collection.BRAND_COLLECTION).findOne({ Name: proDetails.Brands })
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) }, {
                $set: {
                    Name: proDetails.Name,
                    Price: parseInt(proDetails.Price) ,
                    Cutprice: parseInt(proDetails.Cutprice) ,
                    Description: proDetails.Description,
                    Images: proDetails.Images,
                    Category: objectId(Category._id),
                    Brands: objectId(Brands._id),
                    SubCategory: objectId(SubCategory._id),
                    Stock: parseInt(proDetails.Stock) ,
                }
            }).then(() => {
                resolve()
            })
        })
    },
    getAllProductList: () => {
        return new Promise(async (resolve, reject) => {
            let productlist = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $lookup: {
                        from: collection.BRAND_COLLECTION,
                        localField: 'Brands',
                        foreignField: '_id',
                        as: 'Brands'
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

                    $project: {
                        Name: 1,
                        Category: '$Category.Name',
                        Brands: '$Brands.Name',
                        Stock: 1,
                        Cutprice: 1,
                        Price: 1,
                        Images: 1,
                        discountprice: 1,
                        discountpercentage: 1
                    }

                }
            ]).toArray()
            resolve(productlist)
        })
    },
    getProductList: (pageno=1,limit=6) => {

        pageno = parseInt(pageno)
         limit = parseInt(limit)
        let skip = limit * (pageno - 1)
        if (skip <= 0) skip = 0;
        console.log("skip,limit", skip, limit)

        return new Promise(async (resolve, reject) => {
            let productlist = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $lookup: {
                        from: collection.BRAND_COLLECTION,
                        localField: 'Brands',
                        foreignField: '_id',
                        as: 'Brands'
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

                    $project: {
                        Name: 1,
                        Category: '$Category.Name',
                        Brands: '$Brands.Name',
                        Stock: 1,
                        Cutprice: 1,
                        Price: 1,
                        Images: 1,
                        discountprice: 1,
                        discountpercentage: 1
                    }

                }
            ]).skip(skip).limit(limit).toArray()

            productlist.pageno = pageno
            productlist.count = await db.get().collection(collection.PRODUCT_COLLECTION)
                .find().count()
            productlist.count = Math.ceil(productlist.count / limit)
            productlist.pageNos = []
            if (productlist.count < 1) {
                productlist.pageNos = [{ pageno: 1, currentPage: true }]
            } else {
                for (i = 1; i <= productlist.count; i++) {
                    if (pageno == i) {
                        productlist.pageNos.push({
                            pageno: i,
                            currentPage: true
                        })
                    } else {
                        productlist.pageNos.push({
                            pageno: i,
                            currentPage: false
                        })
                    }
                }
            }
            resolve(productlist)
        })
    },
    getSpecificCategory: (catId) => {
        return new Promise(async (resolve, reject) => {
            let productlist = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $match: { Category: objectId(catId) }
                },
                {
                    $project: {
                        Name: 1,
                        Category: 1,
                        SubCategory: 1,
                        Brands: 1,
                        Stock: 1,
                        Price: 1,
                        Description: 1,
                        Images: 1,
                        discountprice: 1,
                        discountpercentage: 1
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
                        from: collection.BRAND_COLLECTION,
                        localField: 'Brands',
                        foreignField: '_id',
                        as: 'Brands'
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
                    $project: {
                        Name: 1,
                        Category: '$Category.Name',
                        SubCategory: '$SubCategory.Name',
                        Brands: '$Brands.Name',
                        Stock: 1,
                        Price: 1,
                        Description: 1,
                        Images: 1,discountprice: 1,
                        discountpercentage: 1
                    }
                }
            ]).toArray()
            resolve(productlist)
        })
    },
    getSpecificSubCategory: (subCatId) => {
        return new Promise(async (resolve, reject) => {
            let productlist = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $match: { SubCategory: objectId(subCatId) }
                },
                {
                    $project: {
                        Name: 1,
                        Category: 1,
                        SubCategory: 1,
                        Brands: 1,
                        Stock: 1,
                        Price: 1,
                        Description: 1,
                        Images: 1,
                        discountprice: 1,
                        discountpercentage: 1
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
                        from: collection.BRAND_COLLECTION,
                        localField: 'Brands',
                        foreignField: '_id',
                        as: 'Brands'
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
                    $project: {
                        Name: 1,
                        Category: '$Category.Name',
                        SubCategory: '$SubCategory.Name',
                        Brands: '$Brands.Name',
                        Stock: 1,
                        Price: 1,
                        Description: 1,
                        Images: 1,discountprice: 1,
                        discountpercentage: 1
                    }
                }
            ]).toArray()
            console.log("aswinproductlist",productlist);
            resolve(productlist)
        })
    },
    productview: (proId) => {
        return new Promise(async (resolve, reject) => {
            let productview = await db.get().collection(collection.PRODUCT_COLLECTION).find({ _id: objectId(proId) }).toArray()
            resolve(productview)
        })
    }
}

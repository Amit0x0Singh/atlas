import express from 'express'
import { authorize } from '../../../middleware/auth.js'
import { listProducts, listProductFilterMeta, getProduct } from './get/product-master.controller.js'
import { validateProductListQuery } from './get/product-master.middleware.js'
import { createProduct } from './create/product-master.controller.js'
import { validateCreateProduct } from './create/product-master.middleware.js'
import { updateProduct } from './update/product-master.controller.js'
import { validateUpdateProduct, validateProductCodeParam as validateUpdateProductCodeParam } from './update/product-master.middleware.js'
import { deleteProduct } from './delete/product-master.controller.js'
import { validateProductCodeParam as validateDeleteProductCodeParam } from './delete/product-master.middleware.js'

const ProductMasterRouter = express.Router()
const canView = authorize('masters.product.view')

// Must come before the /:productCode route below, or Express would match
// "meta" as a product code.
ProductMasterRouter.get('/products/meta/plants', canView, listProductFilterMeta)
ProductMasterRouter.get('/products', canView, validateProductListQuery, listProducts)
ProductMasterRouter.get('/products/:productCode', canView, getProduct)
ProductMasterRouter.post('/products', authorize('masters.product.create'), validateCreateProduct, createProduct)
ProductMasterRouter.put('/products/:productCode', authorize('masters.product.update'), validateUpdateProductCodeParam, validateUpdateProduct, updateProduct)
ProductMasterRouter.delete('/products/:productCode', authorize('masters.product.delete'), validateDeleteProductCodeParam, deleteProduct)

export default ProductMasterRouter

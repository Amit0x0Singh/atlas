import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import { listProducts, listProductFilterMeta, getProduct } from './get/product-master.controller.js'
import { validateProductListQuery } from './get/product-master.middleware.js'
import { createProduct } from './create/product-master.controller.js'
import { validateCreateProduct } from './create/product-master.middleware.js'
import { updateProduct } from './update/product-master.controller.js'
import { validateUpdateProduct, validateProductCodeParam as validateUpdateProductCodeParam } from './update/product-master.middleware.js'
import { deleteProduct } from './delete/product-master.controller.js'
import { validateProductCodeParam as validateDeleteProductCodeParam } from './delete/product-master.middleware.js'

const ProductMasterRouter = express.Router()
const adminOnly = authorize(['admin'])

// Must come before the /:productCode route below, or Express would match
// "meta" as a product code.
ProductMasterRouter.get('/products/meta/plants', authenticate, listProductFilterMeta)
ProductMasterRouter.get('/products', authenticate, validateProductListQuery, listProducts)
ProductMasterRouter.get('/products/:productCode', authenticate, getProduct)
ProductMasterRouter.post('/products', authenticate, adminOnly, validateCreateProduct, createProduct)
ProductMasterRouter.put('/products/:productCode', authenticate, adminOnly, validateUpdateProductCodeParam, validateUpdateProduct, updateProduct)
ProductMasterRouter.delete('/products/:productCode', authenticate, adminOnly, validateDeleteProductCodeParam, deleteProduct)

export default ProductMasterRouter

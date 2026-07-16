import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import { listProducts, getProduct } from './get/product-master.controller.js'
import { createProduct } from './create/product-master.controller.js'
import { validateCreateProduct } from './create/product-master.middleware.js'
import { updateProduct } from './update/product-master.controller.js'
import { validateUpdateProduct, validateProductCodeParam as validateUpdateProductCodeParam } from './update/product-master.middleware.js'
import { deleteProduct } from './delete/product-master.controller.js'
import { validateProductCodeParam as validateDeleteProductCodeParam } from './delete/product-master.middleware.js'

const ProductMasterRouter = express.Router()
const adminOnly = authorize(['admin'])

ProductMasterRouter.get('/products', authenticate, listProducts)
ProductMasterRouter.get('/products/:productCode', authenticate, getProduct)
ProductMasterRouter.post('/products', authenticate, adminOnly, validateCreateProduct, createProduct)
ProductMasterRouter.put('/products/:productCode', authenticate, adminOnly, validateUpdateProductCodeParam, validateUpdateProduct, updateProduct)
ProductMasterRouter.delete('/products/:productCode', authenticate, adminOnly, validateDeleteProductCodeParam, deleteProduct)

export default ProductMasterRouter

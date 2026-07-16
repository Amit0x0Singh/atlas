/**
 * Master Data › Packing Master › Create — Local Middleware
 * capacity/length/width/height/ply/packCount/quantity conversion stays in
 * the controller (parseNum/parseInt2 + uom canonical conversion already
 * handle it) — sanitize only here, plus the two required fields.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateCreatePackingMaterial = preprocess({
  schema: {
    itemName: { required: true, minLength: 2 },
    category: { required: true },
  },
})

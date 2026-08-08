import { preprocess } from '../../../../middleware/preprocessing/index.js'

// Exact vocabulary from ROLE_DEFAULTS in get/employees.controller.js — the
// only place this role list is actually defined in the codebase.
export const EMPLOYEE_ROLES = ['ADMIN', 'SALES', 'PRODUCTION', 'QC', 'DISPATCH', 'PLANNING', 'ACCOUNTS']

export const validateCreateEmployee = preprocess({
  schema: {
    name:    { required: true, minLength: 2, maxLength: 150 },
    email:   { email: true, maxLength: 200 },
    phone:   { phone: true },
    role:    { required: true, enum: EMPLOYEE_ROLES },
    section: { maxLength: 100 },
  },
})

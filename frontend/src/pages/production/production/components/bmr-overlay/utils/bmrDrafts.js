const BMR_STORE = 'erp_bmr_drafts'

export function bmrLoad()   { try { return JSON.parse(localStorage.getItem(BMR_STORE)) || {} } catch { return {} } }
export function bmrSave(d)  { localStorage.setItem(BMR_STORE, JSON.stringify(d)) }

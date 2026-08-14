-- Case-insensitive + whitespace-insensitive uniqueness for every text-bearing
-- @unique / @@unique constraint in the schema, layered on top of app-level
-- normalization (backend/config/db.js Client Extension). Original plain
-- @unique btree indexes are kept as-is -- Prisma schema still expects them --
-- these functional indexes are purely additive.
--
-- citext is deliberately not used (not enabled in this DB; an expression index
-- is lower-risk than a column-type migration). Pre-flight scan
-- (scripts/scan-normalization-conflicts.js), run after the historical-data
-- backfill (scripts/backfill-normalization.js), confirmed zero conflicting
-- groups for every column below as of 2026-08-04 (one genuine duplicate --
-- RmMaster.itemName, 3 case/whitespace-variant rows of the same dummy dev
-- item -- was found and resolved by merging into itemCode 149540 before this
-- migration was written).

CREATE UNIQUE INDEX "ci_company_master_code_idx"
  ON "company_master" (lower(regexp_replace(trim("code"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_employee_master_emp_code_idx"
  ON "employee_master" (lower(regexp_replace(trim("emp_code"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_employee_master_email_idx"
  ON "employee_master" (lower(regexp_replace(trim("email"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_role_permission_role_page_path_idx"
  ON "role_permission" (lower(regexp_replace(trim("role"), '\s+', ' ', 'g')), lower(regexp_replace(trim("page_path"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_rm_master_item_name_idx"
  ON "rm_master" (lower(regexp_replace(trim("item_name"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_print_master_item_code_lot_no_idx"
  ON "print_master" (lower(regexp_replace(trim("item_code"), '\s+', ' ', 'g')), lower(regexp_replace(trim("lot_no"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_pack_detail_print_master_id_bag_no_idx"
  ON "pack_detail" (lower(regexp_replace(trim("print_master_id"), '\s+', ' ', 'g')), "bag_no");

CREATE UNIQUE INDEX "ci_container_master_item_code_idx"
  ON "container_master" (lower(regexp_replace(trim("item_code"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_erp_packs_lot_number_pack_seq_idx"
  ON "erp_packs" (lower(regexp_replace(trim("lot_number"), '\s+', ' ', 'g')), "pack_seq");

CREATE UNIQUE INDEX "ci_erp_containers_container_qr_idx"
  ON "erp_containers" (lower(regexp_replace(trim("container_qr"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_reason_codes_category_code_idx"
  ON "reason_codes" (lower(regexp_replace(trim("category"), '\s+', ' ', 'g')), lower(regexp_replace(trim("code"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_erp_plants_plant_code_idx"
  ON "erp_plants" (lower(regexp_replace(trim("plant_code"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_erp_equipment_equipment_code_idx"
  ON "erp_equipment" (lower(regexp_replace(trim("equipment_code"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_customers_customer_code_idx"
  ON "customers" (lower(regexp_replace(trim("customer_code"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_bom_headers_product_code_bom_version_idx"
  ON "bom_headers" (lower(regexp_replace(trim("product_code"), '\s+', ' ', 'g')), lower(regexp_replace(trim("bom_version"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_packing_materials_item_code_idx"
  ON "packing_materials" (lower(regexp_replace(trim("item_code"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_microbe_master_microbe_code_idx"
  ON "microbe_master" (lower(regexp_replace(trim("microbe_code"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_microbial_sfg_container_container_code_idx"
  ON "microbial_sfg_container" (lower(regexp_replace(trim("container_code"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_production_plan_plan_id_idx"
  ON "production_plan" (lower(regexp_replace(trim("plan_id"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_bom_send_send_id_idx"
  ON "bom_send" (lower(regexp_replace(trim("send_id"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_product_master_product_name_idx"
  ON "product_master" (lower(regexp_replace(trim("product_name"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_equipment_master_equip_code_idx"
  ON "equipment_master" (lower(regexp_replace(trim("equip_code"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_equipment_master_equip_name_idx"
  ON "equipment_master" (lower(regexp_replace(trim("equip_name"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_production_tasks_task_id_idx"
  ON "production_tasks" (lower(regexp_replace(trim("task_id"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_recipe_db_product_code_recipe_no_rm_code_idx"
  ON "recipe_db" (lower(regexp_replace(trim("product_code"), '\s+', ' ', 'g')), "recipe_no", lower(regexp_replace(trim("rm_code"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_technical_detail_batch_id_idx"
  ON "technical_detail" (lower(regexp_replace(trim("batch_id"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_unloading_log_batch_id_idx"
  ON "unloading_log" (lower(regexp_replace(trim("batch_id"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_sieving_log_batch_id_idx"
  ON "sieving_log" (lower(regexp_replace(trim("batch_id"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_packing_log_batch_id_idx"
  ON "packing_log" (lower(regexp_replace(trim("batch_id"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_qc_sample_batch_id_idx"
  ON "qc_sample" (lower(regexp_replace(trim("batch_id"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_inventory_handover_batch_id_idx"
  ON "inventory_handover" (lower(regexp_replace(trim("batch_id"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_sales_order_so_id_idx"
  ON "sales_order" (lower(regexp_replace(trim("so_id"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_customer_profile_customer_name_idx"
  ON "customer_profile" (lower(regexp_replace(trim("customer_name"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_customer_product_profile_customer_name_product_name_idx"
  ON "customer_product_profile" (lower(regexp_replace(trim("customer_name"), '\s+', ' ', 'g')), lower(regexp_replace(trim("product_name"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_users_username_idx"
  ON "users" (lower(regexp_replace(trim("username"), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX "ci_users_email_idx"
  ON "users" (lower(regexp_replace(trim("email"), '\s+', ' ', 'g')));

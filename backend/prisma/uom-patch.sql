-- Run once on any existing database. Applied to dev DB on 2026-07-03.
-- Run this on staging / production before deploying the UOM-aware backend code.

UPDATE rm_master        SET uom = 'KG'  WHERE uom IN ('Kg', 'kg');
UPDATE rm_master        SET uom = 'NOS' WHERE uom IN ('Nos', 'nos');

UPDATE print_master     SET uom = 'KG'  WHERE uom IN ('Kg', 'kg');
UPDATE print_master     SET uom = 'NOS' WHERE uom IN ('Nos', 'nos');

UPDATE container_master SET uom = 'KG'  WHERE uom IN ('Kg', 'kg');

UPDATE erp_packs        SET unit = 'KG' WHERE unit IN ('kg', 'Kg');

UPDATE erp_containers   SET uom = 'KG'  WHERE uom IN ('kg', 'Kg');

UPDATE packing_materials SET uom = 'NOS' WHERE uom IN ('Nos', 'nos');

UPDATE recipe_db SET uom = 'KG' WHERE uom IN ('kg', 'Kg');
UPDATE recipe_db SET uom = 'L'  WHERE uom = 'L';

UPDATE recipe_db SET qty_per_unit = qty_per_unit * 0.001,     uom = 'KG' WHERE uom = 'g';
UPDATE recipe_db SET qty_per_unit = qty_per_unit * 0.000001,  uom = 'KG' WHERE uom = 'mg';
UPDATE recipe_db SET qty_per_unit = qty_per_unit * 0.001,     uom = 'L'  WHERE uom = 'ml';

UPDATE packing_materials SET capacity = capacity * 0.001, capacity_unit = 'KG' WHERE capacity_unit = 'GMS';
UPDATE packing_materials SET capacity = capacity * 0.001, capacity_unit = 'L'  WHERE capacity_unit = 'ML';
UPDATE packing_materials SET capacity_unit = 'L' WHERE capacity_unit = 'LT';

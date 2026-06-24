-- Degrade invalid published products without changing any business data.
UPDATE `Product`
SET `status` = 'DRAFT'
WHERE `status` = 'ACTIVE'
  AND (`price` <= 0 OR `stock` <= 0);

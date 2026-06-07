-- Separate public Winbox forwarding ports from the WireGuard server port.
-- Old rows incorrectly used the WireGuard range (51820-51920) as vpn_port.

WITH numbered AS (
  SELECT
    id,
    32599 + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS new_port
  FROM routers
  WHERE vpn_port IS NULL OR vpn_port BETWEEN 51820 AND 51920
)
UPDATE routers r
SET vpn_port = numbered.new_port,
    vpn_address = 'vpn.icubeug.net:' || numbered.new_port
FROM numbered
WHERE r.id = numbered.id;

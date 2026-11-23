-- Seed only the real cafe location and its guest Wi-Fi hotspot.
-- The unique constraints make this seed safe to run more than once.
WITH katinat_location AS (
  INSERT INTO public.locations (name, address, timezone)
  VALUES (
    'Katinat Saigon Cafe',
    '36 Nguyễn Thị Nghĩa, P. Bến Thành, Quận 1, TP.HCM',
    'Asia/Ho_Chi_Minh'
  )
  ON CONFLICT (name) DO UPDATE
    SET address = EXCLUDED.address,
        timezone = EXCLUDED.timezone
  RETURNING id
)
INSERT INTO public.hotspots (location_id, name, ssid)
SELECT id, 'Katinat Guest Wi-Fi', 'Katinat_Guest'
FROM katinat_location
ON CONFLICT (location_id, ssid) DO UPDATE
  SET name = EXCLUDED.name;

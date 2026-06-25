-- Fix coordinates for Wyprawa Gońców photo markers
UPDATE map_markers SET lat = 50.099737, lng = 19.696981
WHERE quest_id = 'f497bf2d-a9f0-4fef-bce5-282cc32b2a24' AND title = 'Pańskie Kąty';

UPDATE map_markers SET lat = 50.105518, lng = 19.706332
WHERE quest_id = 'f497bf2d-a9f0-4fef-bce5-282cc32b2a24' AND title = 'Skała z krzyżem';

UPDATE map_markers SET lat = 50.106841, lng = 19.709373
WHERE quest_id = 'f497bf2d-a9f0-4fef-bce5-282cc32b2a24' AND title = 'Witold Pilecki';

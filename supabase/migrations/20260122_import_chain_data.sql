-- =============================================
-- Import script untuk data.json ke chain_target table
-- Jalankan setelah migration chain_targets.sql
-- =============================================

-- Catatan: Data ini di-export dari data.json
-- Semua list (Baldr's List 1, 2, dst) digabung menjadi satu tabel tanpa kategori

INSERT INTO chain_target (torn_id, name, level, total_stats, strength, defense, speed, dexterity, status) VALUES
-- Baldr's List 1
(320161, 'crazydave', 35, 990, 234, 244, 257, 255, 'Unknown'),
(522960, 'maverick1972', 31, 396, 106, 107, 99, 84, 'Unknown'),
(488552, 'Mataifa', 31, 640, 292, 39, 218, 91, 'Unknown'),
(810355, 'fanpi017', 30, 654, 195, 138, 146, 175, 'Unknown'),
(524912, 'Luciii', 28, 579, 117, 100, 262, 100, 'Unknown'),
(1682111, '-----Nick----', 28, 638, 197, 121, 177, 143, 'Unknown'),
(387822, 'russellkill', 28, 763, 437, 42, 159, 125, 'Unknown'),
(566484, 'themastercheif', 27, 119, 38, 35, 32, 14, 'Unknown'),
(298167, 'matt007', 27, 194, 113, 18, 32, 31, 'Unknown'),
(879148, 'babymolly', 27, 227, 94, 27, 35, 71, 'Unknown'),
(234429, 'Dragon_Reborn', 27, 470, 117, 69, 173, 111, 'Unknown'),
(428732, 'Sachmo', 27, 580, 289, 86, 114, 91, 'Unknown'),
(18798, 'tapper85', 27, 582, 305, 179, 47, 51, 'Unknown'),
(476620, 'james2503', 26, 129, 68, 11, 34, 16, 'Unknown'),
(472351, 'iBennett', 26, 131, 31, 54, 21, 25, 'Unknown'),
(807823, 'wilash', 26, 134, 65, 14, 31, 24, 'Unknown'),
(1379450, 'nathwin', 26, 249, 60, 62, 66, 61, 'Unknown'),
(796316, 'raysil', 26, 314, 158, 13, 116, 27, 'Unknown'),
(316768, 'ilekilluall8', 26, 335, 139, 33, 130, 33, 'Unknown'),
(153910, 'soldierx', 26, 350, 97, 56, 140, 57, 'Unknown'),
(76096, 'DevilsBlood', 26, 371, 240, 57, 29, 45, 'Unknown'),
(659852, 'mikeycallin1', 26, 415, 128, 82, 118, 87, 'Unknown'),
(738073, 'warriorscode', 26, 445, 112, 141, 114, 78, 'Unknown'),
(284536, 'whiteshadow', 26, 509, 135, 114, 142, 118, 'Unknown'),
(263120, 'halfblood93', 26, 805, 206, 123, 371, 105, 'Unknown'),
(729174, 'fortunecookie', 26, 897, 305, 199, 186, 207, 'Unknown'),
(1489357, 'Aceraven', 25, 221, 60, 61, 55, 45, 'Unknown'),
(669996, 'Boylinger', 25, 264, 95, 42, 78, 49, 'Unknown'),
(191060, 'nemesis2000', 25, 294, 143, 29, 90, 32, 'Unknown'),
(454302, 'heva07', 25, 333, 50, 136, 35, 112, 'Unknown'),
(1046495, 'OwlByNite', 29, 450, 141, 104, 101, 104, 'Unknown'),
(1199189, 'Bob_the_butler', 25, 423, 100, 101, 110, 112, 'Unknown'),
(485156, 'ckirklin', 25, 453, 195, 76, 111, 71, 'Unknown'),
(1399310, 'theking99218', 25, 468, 96, 164, 95, 113, 'Unknown'),
(581300, 'srfshannon', 25, 475, 119, 118, 119, 119, 'Unknown'),
(211286, 'andre_xavier', 25, 561, 199, 149, 109, 104, 'Unknown'),
(469582, 'CasterZ', 25, 622, 123, 77, 228, 194, 'Unknown'),
(652354, '-Diablo-', 25, 640, 213, 107, 199, 121, 'Unknown'),
(781161, 'xZULUx', 25, 648, 152, 147, 198, 151, 'Unknown'),
(491724, 'indo', 25, 716, 285, 60, 144, 227, 'Unknown'),
(233040, 'kracker65', 25, 719, 299, 37, 131, 252, 'Unknown'),
(688148, 'terrence_taylor', 25, 824, 347, 109, 204, 164, 'Unknown'),
(442427, 'Man-u-4-Life', 25, 846, 439, 27, 366, 14, 'Unknown'),
(588113, 'Morphine2man', 25, 916, 364, 165, 215, 172, 'Unknown'),
(669588, 'PRlNCE', 25, 970, 56, 10, 293, 611, 'Unknown')
ON CONFLICT (torn_id) DO UPDATE SET
    name = EXCLUDED.name,
    level = EXCLUDED.level,
    total_stats = EXCLUDED.total_stats,
    strength = EXCLUDED.strength,
    defense = EXCLUDED.defense,
    speed = EXCLUDED.speed,
    dexterity = EXCLUDED.dexterity;

-- Lanjutan dari data.json - akan ditambahkan lebih banyak data saat deployment

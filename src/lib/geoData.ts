// Comprehensive geographical reference data for France: Departments, Regions and Cities centroids

export interface DepartmentInfo {
  code: string;
  name: string;
  region: string;
  centroid: [number, number]; // [lat, lng]
}

export const FRENCH_REGIONS: Record<string, [number, number]> = {
  "Auvergne-Rhône-Alpes": [45.5, 4.8],
  "Bourgogne-Franche-Comté": [47.1, 5.0],
  "Bretagne": [48.1, -2.8],
  "Centre-Val de Loire": [47.5, 1.8],
  "Corse": [42.0, 9.1],
  "Grand Est": [48.6, 6.0],
  "Hauts-de-France": [50.1, 2.8],
  "Île-de-France": [48.85, 2.35],
  "Normandie": [49.1, 0.2],
  "Nouvelle-Aquitaine": [45.3, 0.1],
  "Occitanie": [43.6, 2.1],
  "Pays de la Loire": [47.5, -0.8],
  "Provence-Alpes-Côte d'Azur": [43.9, 6.0],
};

export const FRENCH_DEPARTMENTS: Record<string, DepartmentInfo> = {
  "01": { code: "01", name: "Ain", region: "Auvergne-Rhône-Alpes", centroid: [46.1, 5.3] },
  "02": { code: "02", name: "Aisne", region: "Hauts-de-France", centroid: [49.5, 3.6] },
  "03": { code: "03", name: "Allier", region: "Auvergne-Rhône-Alpes", centroid: [46.3, 3.2] },
  "04": { code: "04", name: "Alpes-de-Haute-Provence", region: "Provence-Alpes-Côte d'Azur", centroid: [44.1, 6.2] },
  "05": { code: "05", name: "Hautes-Alpes", region: "Provence-Alpes-Côte d'Azur", centroid: [44.7, 6.3] },
  "06": { code: "06", name: "Alpes-Maritimes", region: "Provence-Alpes-Côte d'Azur", centroid: [43.9, 7.1] },
  "07": { code: "07", name: "Ardèche", region: "Auvergne-Rhône-Alpes", centroid: [44.7, 4.4] },
  "08": { code: "08", name: "Ardennes", region: "Grand Est", centroid: [49.6, 4.7] },
  "09": { code: "09", name: "Ariège", region: "Occitanie", centroid: [42.9, 1.5] },
  "10": { code: "10", name: "Aube", region: "Grand Est", centroid: [48.3, 4.1] },
  "11": { code: "11", name: "Aude", region: "Occitanie", centroid: [43.1, 2.4] },
  "12": { code: "12", name: "Aveyron", region: "Occitanie", centroid: [44.3, 2.6] },
  "13": { code: "13", name: "Bouches-du-Rhône", region: "Provence-Alpes-Côte d'Azur", centroid: [43.5, 5.1] },
  "14": { code: "14", name: "Calvados", region: "Normandie", centroid: [49.1, -0.3] },
  "15": { code: "15", name: "Cantal", region: "Auvergne-Rhône-Alpes", centroid: [45.0, 2.7] },
  "16": { code: "16", name: "Charente", region: "Nouvelle-Aquitaine", centroid: [45.7, 0.2] },
  "17": { code: "17", name: "Charente-Maritime", region: "Nouvelle-Aquitaine", centroid: [45.8, -0.7] },
  "18": { code: "18", name: "Cher", region: "Centre-Val de Loire", centroid: [47.1, 2.4] },
  "19": { code: "19", name: "Corrèze", region: "Nouvelle-Aquitaine", centroid: [45.3, 1.9] },
  "21": { code: "21", name: "Côte-d'Or", region: "Bourgogne-Franche-Comté", centroid: [47.3, 4.8] },
  "22": { code: "22", name: "Côtes-d'Armor", region: "Bretagne", centroid: [48.4, -2.8] },
  "23": { code: "23", name: "Creuse", region: "Nouvelle-Aquitaine", centroid: [46.0, 2.0] },
  "24": { code: "24", name: "Dordogne", region: "Nouvelle-Aquitaine", centroid: [45.1, 0.7] },
  "25": { code: "25", name: "Doubs", region: "Bourgogne-Franche-Comté", centroid: [47.1, 6.4] },
  "26": { code: "26", name: "Drôme", region: "Auvergne-Rhône-Alpes", centroid: [44.7, 5.2] },
  "27": { code: "27", name: "Eure", region: "Normandie", centroid: [49.1, 1.1] },
  "28": { code: "28", name: "Eure-et-Loir", region: "Centre-Val de Loire", centroid: [48.4, 1.4] },
  "29": { code: "29", name: "Finistère", region: "Bretagne", centroid: [48.2, -4.1] },
  "2A": { code: "2A", name: "Corse-du-Sud", region: "Corse", centroid: [41.9, 8.9] },
  "2B": { code: "2B", name: "Haute-Corse", region: "Corse", centroid: [42.4, 9.3] },
  "30": { code: "30", name: "Gard", region: "Occitanie", centroid: [44.0, 4.2] },
  "31": { code: "31", name: "Haute-Garonne", region: "Occitanie", centroid: [43.4, 1.2] },
  "32": { code: "32", name: "Gers", region: "Occitanie", centroid: [43.7, 0.6] },
  "33": { code: "33", name: "Gironde", region: "Nouvelle-Aquitaine", centroid: [44.8, -0.6] },
  "34": { code: "34", name: "Hérault", region: "Occitanie", centroid: [43.6, 3.2] },
  "35": { code: "35", name: "Ille-et-Vilaine", region: "Bretagne", centroid: [48.2, -1.7] },
  "36": { code: "36", name: "Indre", region: "Centre-Val de Loire", centroid: [46.8, 1.7] },
  "37": { code: "37", name: "Indre-et-Loire", region: "Centre-Val de Loire", centroid: [47.2, 0.7] },
  "38": { code: "38", name: "Isère", region: "Auvergne-Rhône-Alpes", centroid: [45.3, 5.5] },
  "39": { code: "39", name: "Jura", region: "Bourgogne-Franche-Comté", centroid: [46.7, 5.7] },
  "40": { code: "40", name: "Landes", region: "Nouvelle-Aquitaine", centroid: [43.9, -0.8] },
  "41": { code: "41", name: "Loir-et-Cher", region: "Centre-Val de Loire", centroid: [47.6, 1.3] },
  "42": { code: "42", name: "Loire", region: "Auvergne-Rhône-Alpes", centroid: [45.7, 4.2] },
  "43": { code: "43", name: "Haute-Loire", region: "Auvergne-Rhône-Alpes", centroid: [45.1, 3.8] },
  "44": { code: "44", name: "Loire-Atlantique", region: "Pays de la Loire", centroid: [47.3, -1.7] },
  "45": { code: "45", name: "Loiret", region: "Centre-Val de Loire", centroid: [47.9, 2.3] },
  "46": { code: "46", name: "Lot", region: "Occitanie", centroid: [44.6, 1.6] },
  "47": { code: "47", name: "Lot-et-Garonne", region: "Nouvelle-Aquitaine", centroid: [44.4, 0.4] },
  "48": { code: "48", name: "Lozère", region: "Occitanie", centroid: [44.5, 3.5] },
  "49": { code: "49", name: "Maine-et-Loire", region: "Pays de la Loire", centroid: [47.4, -0.5] },
  "50": { code: "50", name: "Manche", region: "Normandie", centroid: [49.1, -1.3] },
  "51": { code: "51", name: "Marne", region: "Grand Est", centroid: [48.9, 4.2] },
  "52": { code: "52", name: "Haute-Marne", region: "Grand Est", centroid: [48.1, 5.2] },
  "53": { code: "53", name: "Mayenne", region: "Pays de la Loire", centroid: [48.1, -0.6] },
  "54": { code: "54", name: "Meurthe-et-Moselle", region: "Grand Est", centroid: [48.7, 6.2] },
  "55": { code: "55", name: "Meuse", region: "Grand Est", centroid: [49.0, 5.4] },
  "56": { code: "56", name: "Morbihan", region: "Bretagne", centroid: [47.8, -2.8] },
  "57": { code: "57", name: "Moselle", region: "Grand Est", centroid: [49.0, 6.7] },
  "58": { code: "58", name: "Nièvre", region: "Bourgogne-Franche-Comté", centroid: [47.1, 3.5] },
  "59": { code: "59", name: "Nord", region: "Hauts-de-France", centroid: [50.4, 3.2] },
  "60": { code: "60", name: "Oise", region: "Hauts-de-France", centroid: [49.4, 2.4] },
  "61": { code: "61", name: "Orne", region: "Normandie", centroid: [48.6, 0.1] },
  "62": { code: "62", name: "Pas-de-Calais", region: "Hauts-de-France", centroid: [50.5, 2.3] },
  "63": { code: "63", name: "Puy-de-Dôme", region: "Auvergne-Rhône-Alpes", centroid: [45.7, 3.1] },
  "64": { code: "64", name: "Pyrénées-Atlantiques", region: "Nouvelle-Aquitaine", centroid: [43.3, -0.8] },
  "65": { code: "65", name: "Hautes-Pyrénées", region: "Occitanie", centroid: [43.1, 0.2] },
  "66": { code: "66", name: "Pyrénées-Orientales", region: "Occitanie", centroid: [42.6, 2.6] },
  "67": { code: "67", name: "Bas-Rhin", region: "Grand Est", centroid: [48.7, 7.6] },
  "68": { code: "68", name: "Haut-Rhin", region: "Grand Est", centroid: [47.8, 7.3] },
  "69": { code: "69", name: "Rhône / Métropole de Lyon", region: "Auvergne-Rhône-Alpes", centroid: [45.76, 4.84] },
  "70": { code: "70", name: "Haute-Saône", region: "Bourgogne-Franche-Comté", centroid: [47.6, 6.1] },
  "71": { code: "71", name: "Saône-et-Loire", region: "Bourgogne-Franche-Comté", centroid: [46.7, 4.6] },
  "72": { code: "72", name: "Sarthe", region: "Pays de la Loire", centroid: [48.0, 0.2] },
  "73": { code: "73", name: "Savoie", region: "Auvergne-Rhône-Alpes", centroid: [45.5, 6.4] },
  "74": { code: "74", name: "Haute-Savoie", region: "Auvergne-Rhône-Alpes", centroid: [46.0, 6.4] },
  "75": { code: "75", name: "Paris", region: "Île-de-France", centroid: [48.8566, 2.3522] },
  "76": { code: "76", name: "Seine-Maritime", region: "Normandie", centroid: [49.6, 1.0] },
  "77": { code: "77", name: "Seine-et-Marne", region: "Île-de-France", centroid: [48.6, 2.9] },
  "78": { code: "78", name: "Yvelines", region: "Île-de-France", centroid: [48.8, 1.9] },
  "79": { code: "79", name: "Deux-Sèvres", region: "Nouvelle-Aquitaine", centroid: [46.5, -0.3] },
  "80": { code: "80", name: "Somme", region: "Hauts-de-France", centroid: [49.9, 2.3] },
  "81": { code: "81", name: "Tarn", region: "Occitanie", centroid: [43.8, 2.2] },
  "82": { code: "82", name: "Tarn-et-Garonne", region: "Occitanie", centroid: [44.1, 1.3] },
  "83": { code: "83", name: "Var", region: "Provence-Alpes-Côte d'Azur", centroid: [43.4, 6.2] },
  "84": { code: "84", name: "Vaucluse", region: "Provence-Alpes-Côte d'Azur", centroid: [44.0, 5.1] },
  "85": { code: "85", name: "Vendée", region: "Pays de la Loire", centroid: [46.7, -1.3] },
  "86": { code: "86", name: "Vienne", region: "Nouvelle-Aquitaine", centroid: [46.6, 0.4] },
  "87": { code: "87", name: "Haute-Vienne", region: "Nouvelle-Aquitaine", centroid: [45.9, 1.2] },
  "88": { code: "88", name: "Vosges", region: "Grand Est", centroid: [48.2, 6.4] },
  "89": { code: "89", name: "Yonne", region: "Bourgogne-Franche-Comté", centroid: [47.8, 3.6] },
  "90": { code: "90", name: "Territoire de Belfort", region: "Bourgogne-Franche-Comté", centroid: [47.6, 6.9] },
  "91": { code: "91", name: "Essonne", region: "Île-de-France", centroid: [48.5, 2.3] },
  "92": { code: "92", name: "Hauts-de-Seine", region: "Île-de-France", centroid: [48.8, 2.2] },
  "93": { code: "93", name: "Seine-Saint-Denis", region: "Île-de-France", centroid: [48.9, 2.4] },
  "94": { code: "94", name: "Val-de-Marne", region: "Île-de-France", centroid: [48.8, 2.5] },
  "95": { code: "95", name: "Val-d'Oise", region: "Île-de-France", centroid: [49.1, 2.1] },
};

export const FRENCH_CITIES_MAP: Record<
  string,
  { name: string; dept: string; region: string; coords: [number, number] }
> = {
  paris: { name: "Paris", dept: "75", region: "Île-de-France", coords: [48.8566, 2.3522] },
  toulouse: { name: "Toulouse", dept: "31", region: "Occitanie", coords: [43.6047, 1.4442] },
  colomiers: { name: "Colomiers", dept: "31", region: "Occitanie", coords: [43.6136, 1.3344] },
  fonbeauzard: { name: "Fonbeauzard", dept: "31", region: "Occitanie", coords: [43.6706, 1.4358] },
  fonsorbes: { name: "Fonsorbes", dept: "31", region: "Occitanie", coords: [43.5358, 1.2333] },
  portet_sur_garonne: { name: "Portet-sur-Garonne", dept: "31", region: "Occitanie", coords: [43.5239, 1.4056] },
  villemur_sur_tarn: { name: "Villemur-sur-Tarn", dept: "31", region: "Occitanie", coords: [43.8647, 1.5056] },
  st_sulpice_la_pointe: { name: "Saint-Sulpice-la-Pointe", dept: "81", region: "Occitanie", coords: [43.7753, 1.6853] },
  montauban: { name: "Montauban", dept: "82", region: "Occitanie", coords: [44.0176, 1.3547] },
  perpignan: { name: "Perpignan", dept: "66", region: "Occitanie", coords: [42.6887, 2.8948] },
  narbonne: { name: "Narbonne", dept: "11", region: "Occitanie", coords: [43.1838, 3.0042] },

  lyon: { name: "Lyon", dept: "69", region: "Auvergne-Rhône-Alpes", coords: [45.764, 4.8357] },
  bron: { name: "Bron", dept: "69", region: "Auvergne-Rhône-Alpes", coords: [45.7333, 4.9133] },
  vaulx_en_velin: { name: "Vaulx-en-Velin", dept: "69", region: "Auvergne-Rhône-Alpes", coords: [45.7878, 4.9222] },
  venissieux: { name: "Vénissieux", dept: "69", region: "Auvergne-Rhône-Alpes", coords: [45.6981, 4.8867] },
  villefranche_sur_saone: { name: "Villefranche-sur-Saône", dept: "69", region: "Auvergne-Rhône-Alpes", coords: [45.9903, 4.7194] },
  decines_charpieu: { name: "Décines-Charpieu", dept: "69", region: "Auvergne-Rhône-Alpes", coords: [45.7694, 4.9583] },
  st_priest: { name: "Saint-Priest", dept: "69", region: "Auvergne-Rhône-Alpes", coords: [45.6972, 4.9458] },
  rillieux_la_pape: { name: "Rillieux-la-Pape", dept: "69", region: "Auvergne-Rhône-Alpes", coords: [45.8208, 4.8986] },
  tassin_la_demi_lune: { name: "Tassin-la-Demi-Lune", dept: "69", region: "Auvergne-Rhône-Alpes", coords: [45.7639, 4.7806] },

  saint_etienne: { name: "Saint-Étienne", dept: "42", region: "Auvergne-Rhône-Alpes", coords: [45.4397, 4.3872] },
  st_etienne: { name: "Saint-Étienne", dept: "42", region: "Auvergne-Rhône-Alpes", coords: [45.4397, 4.3872] },
  savigneux: { name: "Savigneux", dept: "42", region: "Auvergne-Rhône-Alpes", coords: [45.6078, 4.0817] },

  bourg_en_bresse: { name: "Bourg-en-Bresse", dept: "01", region: "Auvergne-Rhône-Alpes", coords: [46.2056, 5.2289] },
  beynost: { name: "Beynost", dept: "01", region: "Auvergne-Rhône-Alpes", coords: [45.8406, 4.9986] },
  bage_le_chatel: { name: "Bâgé-le-Châtel", dept: "01", region: "Auvergne-Rhône-Alpes", coords: [46.3081, 4.9317] },
  villieu_loyes_mollon: { name: "Villieu-Loyes-Mollon", dept: "01", region: "Auvergne-Rhône-Alpes", coords: [45.9222, 5.2222] },

  valence: { name: "Valence", dept: "26", region: "Auvergne-Rhône-Alpes", coords: [44.9334, 4.8924] },
  montelimar: { name: "Montélimar", dept: "26", region: "Auvergne-Rhône-Alpes", coords: [44.5581, 4.7508] },
  livron_sur_drome: { name: "Livron-sur-Drôme", dept: "26", region: "Auvergne-Rhône-Alpes", coords: [44.7733, 4.8436] },
  piegros_la_clastre: { name: "Piégros-la-Clastre", dept: "26", region: "Auvergne-Rhône-Alpes", coords: [44.6989, 5.0975] },

  grenoble: { name: "Grenoble", dept: "38", region: "Auvergne-Rhône-Alpes", coords: [45.1885, 5.7245] },
  echirolles: { name: "Échirolles", dept: "38", region: "Auvergne-Rhône-Alpes", coords: [45.1433, 5.7183] },
  le_peage_de_roussillon: { name: "Le Péage-de-Roussillon", dept: "38", region: "Auvergne-Rhône-Alpes", coords: [45.3722, 4.7972] },

  cournon_d_auvergne: { name: "Cournon-d'Auvergne", dept: "63", region: "Auvergne-Rhône-Alpes", coords: [45.7425, 3.1972] },
  thonon_les_bains: { name: "Thonon-les-Bains", dept: "74", region: "Auvergne-Rhône-Alpes", coords: [46.3706, 6.4789] },
  ville_la_grand: { name: "Ville-la-Grand", dept: "74", region: "Auvergne-Rhône-Alpes", coords: [46.2017, 6.2708] },
  marigny_st_marcel: { name: "Marigny-Saint-Marcel", dept: "74", region: "Auvergne-Rhône-Alpes", coords: [45.8306, 5.9861] },

  dijon: { name: "Dijon", dept: "21", region: "Bourgogne-Franche-Comté", coords: [47.322, 5.0415] },
  quetigny: { name: "Quetigny", dept: "21", region: "Bourgogne-Franche-Comté", coords: [47.3139, 5.1056] },
  semur_en_auxois: { name: "Semur-en-Auxois", dept: "21", region: "Bourgogne-Franche-Comté", coords: [47.4917, 4.3314] },

  besancon: { name: "Besançon", dept: "25", region: "Bourgogne-Franche-Comté", coords: [47.2378, 6.0241] },
  chalezeule: { name: "Chalezeule", dept: "25", region: "Bourgogne-Franche-Comté", coords: [47.2583, 6.0683] },
  beure: { name: "Beure", dept: "25", region: "Bourgogne-Franche-Comté", coords: [47.2081, 6.0042] },
  valdahon: { name: "Valdahon", dept: "25", region: "Bourgogne-Franche-Comté", coords: [47.1492, 6.3444] },
  quingey: { name: "Quingey", dept: "25", region: "Bourgogne-Franche-Comté", coords: [47.1031, 5.8833] },
  arbois: { name: "Arbois", dept: "39", region: "Bourgogne-Franche-Comté", coords: [46.9031, 5.7744] },

  chalon_sur_saone: { name: "Chalon-sur-Saône", dept: "71", region: "Bourgogne-Franche-Comté", coords: [46.7806, 4.8528] },
  macon: { name: "Mâcon", dept: "71", region: "Bourgogne-Franche-Comté", coords: [46.3069, 4.8317] },
  autun: { name: "Autun", dept: "71", region: "Bourgogne-Franche-Comté", coords: [46.9514, 4.2986] },
  st_laurent_sur_saone: { name: "Saint-Laurent-sur-Saône", dept: "01", region: "Auvergne-Rhône-Alpes", coords: [46.3056, 4.8417] },

  marseille: { name: "Marseille", dept: "13", region: "Provence-Alpes-Côte d'Azur", coords: [43.2965, 5.3698] },
  nice: { name: "Nice", dept: "06", region: "Provence-Alpes-Côte d'Azur", coords: [43.7102, 7.262] },
  bordeaux: { name: "Bordeaux", dept: "33", region: "Nouvelle-Aquitaine", coords: [44.8378, -0.5792] },
  nantes: { name: "Nantes", dept: "44", region: "Pays de la Loire", coords: [47.2184, -1.5536] },
  strasbourg: { name: "Strasbourg", dept: "67", region: "Grand Est", coords: [48.5734, 7.7521] },
  montpellier: { name: "Montpellier", dept: "34", region: "Occitanie", coords: [43.6108, 3.8767] },
  lille: { name: "Lille", dept: "59", region: "Hauts-de-France", coords: [50.6292, 3.0573] },
  rennes: { name: "Rennes", dept: "35", region: "Bretagne", coords: [48.1173, -1.6778] },
};

export function normalizeGeoKey(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function resolveClientGeoData(
  cityRaw: string,
  postalCodeRaw?: string,
  customCoords?: [number, number] | null
): {
  city: string;
  deptCode: string;
  deptName: string;
  region: string;
  coords: [number, number];
} {
  // 1. Direct city lookup
  const cityKey = normalizeGeoKey(cityRaw || "");
  const cityMatch = FRENCH_CITIES_MAP[cityKey];

  if (cityMatch && !customCoords) {
    const deptInfo = FRENCH_DEPARTMENTS[cityMatch.dept];
    return {
      city: cityMatch.name,
      deptCode: cityMatch.dept,
      deptName: deptInfo?.name || cityMatch.dept,
      region: cityMatch.region,
      coords: cityMatch.coords,
    };
  }

  // 2. Postal code extraction
  let deptCode = "75";
  const cleanZip = (postalCodeRaw || "").trim();
  if (cleanZip.length >= 2) {
    const prefix2 = cleanZip.slice(0, 2);
    if (FRENCH_DEPARTMENTS[prefix2]) {
      deptCode = prefix2;
    }
  }

  const deptInfo = FRENCH_DEPARTMENTS[deptCode] || FRENCH_DEPARTMENTS["75"];
  const coords = customCoords || (cityMatch ? cityMatch.coords : deptInfo.centroid);

  return {
    city: cityMatch?.name || cityRaw || deptInfo.name,
    deptCode,
    deptName: deptInfo.name,
    region: deptInfo.region,
    coords,
  };
}

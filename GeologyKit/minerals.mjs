/**
 * MINERAL ATLAS — 31 Procedural Cabinet Specimens
 * SPDX-License-Identifier: MIT
 *
 * Standalone Three.js ES module. No textures, fonts, loaders, DOM, or network assets.
 *
 * QUICK START
 *   scene.add(createAsset({ mineralType: 'amethyst' }));
 *   scene.add(createAsset({ mineralType: 'pyrite', mergeForProduction: true }));
 *
 * The factory creates ONE complete, selected specimen. The exported catalog
 * contains 31 mineral/variety definitions, including seven quartz varieties.
 *
 * DEFAULT DIMENSIONS
 *   0.660 W × 0.420 H × 0.500 D meters, including the museum display base.
 *   Dimensions are rebuilt mathematically; object scaling is never used for sizing.
 *   Typically 4,000–28,000 triangles. Exact generated statistics: userData.specs.
 *
 * MATERIALS
 *   Up to five material batches: crystals, matrix, shards, mount, placard.
 *   Production mode uses one mesh per material, not one mesh per crystal.
 *   Physical transmission uses Three.js's internal render pass; no environment
 *   map or external texture is required.
 *
 * EDITING
 *   Default mode retains individually named, selectable meshes.
 *   Both modes retain semantic assemblies and a reversible part API:
 *     asset.userData.parts.detach('crystal_001')
 *     asset.userData.parts.reattach('crystal_001')
 *     asset.userData.parts.setVisible('matrix', false)
 *     asset.userData.parts.resolveIntersection(raycasterIntersection)
 *
 * RIG
 *   specimen: Y-axis turntable rotation, degrees [-180, 180].
 *
 * DETACH
 *   crystals, individual crystal_NNN meshes, matrix, shards, individual shard_NNN
 *   meshes, placard, mount. Production detachment materializes the selected part
 *   and rebuilds its original batch. Reattachment restores its original pose.
 *
 * LICENSING
 *   MIT. Geometry, vector lettering, and mineral appearance are generated inline.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const UNIT_SCALE = new THREE.Vector3(1, 1, 1);

const BASE = {
  crystal: '#8d58cc',
  tip: '#cbb0ee',
  shadow: '#503075',
  band: '#e5d8ed',
  core: '#b58bdc',
  shard: '#b09acb',
  matrix: '#48414c',
  matrixLight: '#756776',
  matrixDark: '#29272f',
  vein: '#b8acbc',
  mount: '#232d38',
  trim: '#b99b62',
  placard: '#e8e2d1',
  ink: '#27313b'
};

export const COLORWAYS = {
  default: { ...BASE },
  vintage: {
    ...BASE,
    matrix: '#766651',
    matrixLight: '#a18b6c',
    matrixDark: '#443a31',
    vein: '#d3bd94',
    mount: '#433c35',
    trim: '#c39750',
    placard: '#ead8af',
    ink: '#493728'
  },
  slate: {
    ...BASE,
    matrix: '#4d616d',
    matrixLight: '#81929c',
    matrixDark: '#283b45',
    vein: '#c6d3d5',
    mount: '#1b2934',
    trim: '#a5bcc6',
    placard: '#dce6e7',
    ink: '#213746'
  },
  gallery: {
    ...BASE,
    matrix: '#817b74',
    matrixLight: '#b6afa5',
    matrixDark: '#514d48',
    vein: '#e6ddd0',
    mount: '#ddd9d0',
    trim: '#a48958',
    placard: '#f2eee3',
    ink: '#343c43'
  }
};

export const presets = COLORWAYS;

function mineral(label, formula, system, hardness, kind, aspect, colors, options = {}) {
  return {
    label,
    formula,
    system,
    hardness,
    kind,
    aspect,
    formation: 'matrix',
    ior: 1.55,
    transparency: 0.5,
    roughness: 0.2,
    metalness: 0,
    iridescence: 0,
    fluorescence: null,
    fluorescenceStrength: 0,
    palette: {
      crystal: colors[0],
      tip: colors[1],
      shadow: colors[2],
      band: colors[3],
      core: colors[4] || colors[1],
      shard: colors[1]
    },
    host: ['#514d4c', '#80776b', '#302e30', '#c2b7a3'],
    ...options
  };
}

const CATALOG_DEFINITIONS = {
  quartz: mineral('Rock crystal', 'SiO2', 'Trigonal', '7', 'quartz', 0.17,
    ['#c7e2ed', '#f0f8fb', '#799dad', '#e0e9e8'], {
      transparency: 0.98, ior: 1.544,
      describe: 'Colorless quartz: six-sided prisms with rhombohedral pointed terminations.'
    }),
  amethyst: mineral('Amethyst', 'SiO2', 'Trigonal', '7', 'quartz', 0.215,
    ['#8d58cc', '#cbb0ee', '#503075', '#e5d8ed'], {
      transparency: 0.86, ior: 1.544,
      host: ['#48414c', '#756776', '#29272f', '#b8acbc'],
      describe: 'Purple quartz with pale roots, saturated prism faces, and pointed terminations.'
    }),
  citrine: mineral('Citrine', 'SiO2', 'Trigonal', '7', 'quartz', 0.18,
    ['#dda739', '#ffe7a0', '#956224', '#f5dab2'], {
      transparency: 0.88, ior: 1.544,
      describe: 'Golden yellow quartz; hexagonal prisms with warm, clear terminations.'
    }),
  'smoky-quartz': mineral('Smoky quartz', 'SiO2', 'Trigonal', '7', 'quartz', 0.165,
    ['#76675c', '#bdac94', '#393641', '#d2c6b6'], {
      transparency: 0.78, ior: 1.544,
      describe: 'Long smoky brown quartz prisms with translucent gray-brown points.'
    }),
  'rose-quartz': mineral('Rose quartz', 'SiO2', 'Trigonal', '7', 'massive', 0.66,
    ['#dc91a8', '#f8d3dc', '#a76888', '#efbbc8'], {
      formation: 'single', transparency: 0.24, roughness: 0.3, ior: 1.544,
      describe: 'A massive pink quartz fragment with continuous irregular fracture faces.'
    }),
  'milky-quartz': mineral('Milky quartz', 'SiO2', 'Trigonal', '7', 'quartz', 0.235,
    ['#d8e1df', '#fff9ed', '#a3b5bc', '#ebe7db'], {
      transparency: 0.2, roughness: 0.29, ior: 1.544,
      describe: 'Clouded white quartz prisms with frosted roots and pale terminations.'
    }),
  chalcedony: mineral('Chalcedony', 'SiO2', 'Trigonal', '6.5-7', 'botryoidal', 0.84,
    ['#8fbcc9', '#d5e9e9', '#567f99', '#b0d6de'], {
      formation: 'cluster', transparency: 0.18, roughness: 0.24,
      describe: 'Microcrystalline quartz modeled as a continuous, pale blue botryoidal surface.'
    }),
  calcite: mineral('Calcite', 'CaCO3', 'Trigonal', '3', 'rhombohedral', 0.81,
    ['#dec18b', '#fff0c7', '#a38960', '#eee0ba'], {
      transparency: 0.65, ior: 1.59,
      fluorescence: '#ff9874', fluorescenceStrength: 0.35,
      describe: 'Honey calcite with true rhombohedral faces and oblique cleavage angles.'
    }),
  fluorite: mineral('Fluorite', 'CaF2', 'Cubic', '4', 'cubic', 0.5,
    ['#987bcc', '#d8c5ef', '#604b99', '#8bcab5'], {
      transparency: 0.83, ior: 1.434,
      fluorescence: '#7772ff', fluorescenceStrength: 0.55,
      describe: 'Beveled violet cubes with restrained green and purple square growth zoning.'
    }),
  halite: mineral('Halite', 'NaCl', 'Cubic', '2-2.5', 'hopper', 0.5,
    ['#e7b9a9', '#fff0df', '#bd8e92', '#f6d6c2'], {
      transparency: 0.9, ior: 1.544,
      fluorescence: '#ff965b', fluorescenceStrength: 0.15,
      host: ['#a69685', '#d3c4ad', '#72695e', '#ece1cb'],
      describe: 'Pale peach hopper cubes with genuinely recessed, stepped square interiors.'
    }),
  gypsum: mineral('Gypsum', 'CaSO4.2H2O', 'Monoclinic', '2', 'bladed', 0.2,
    ['#d5ded8', '#f6f4df', '#a2b7bb', '#e6e8dc'], {
      transparency: 0.86, ior: 1.52,
      describe: 'Selenite: thin monoclinic blades, beveled cleavage edges, and slanted tips.'
    }),
  pyrite: mineral('Pyrite', 'FeS2', 'Cubic', '6-6.5', 'cubic', 0.5,
    ['#bd993f', '#f2d882', '#76602d', '#d9bd66'], {
      transparency: 0, metalness: 0.83, roughness: 0.23,
      host: ['#43474b', '#707477', '#272c32', '#b4aaa0'],
      describe: 'Brassy intergrown cubes with beveled edges and perpendicular growth striations.'
    }),
  galena: mineral('Galena', 'PbS', 'Cubic', '2.5', 'cubic', 0.5,
    ['#8794a2', '#dde5eb', '#404a59', '#b2c2cc'], {
      transparency: 0, metalness: 0.88, roughness: 0.2,
      describe: 'Lead-gray metallic cubes with bright cleavage edges and stepped surface traces.'
    }),
  garnet: mineral('Garnet', 'Fe3Al2(SiO4)3', 'Cubic', '6.5-7.5', 'dodecahedral', 0.5,
    ['#963547', '#d3777b', '#4d2438', '#b95760'], {
      transparency: 0.28, ior: 1.79,
      host: ['#696569', '#9d9494', '#403f45', '#d0c6bc'],
      describe: 'Almandine-red rhombic dodecahedra, not spherical approximations.'
    }),
  tourmaline: mineral('Tourmaline', 'Na(Li,Al)3Al6(BO3)3Si6O18(OH)4', 'Trigonal', '7-7.5', 'tourmaline', 0.155,
    ['#367c60', '#94c396', '#1c493c', '#e4e1b5', '#d77d9f'], {
      shortFormula: 'BOROSILICATE',
      transparency: 0.59, ior: 1.63,
      host: ['#b6a997', '#e1d3b9', '#776f66', '#ece1cc'],
      describe: 'Striated trigonal prisms with green rind, pale ring, and pink watermelon cores.'
    }),
  beryl: mineral('Beryl', 'Be3Al2Si6O18', 'Hexagonal', '7.5-8', 'beryl', 0.23,
    ['#9cbd83', '#e3e9b4', '#5c8d69', '#c2d6a3'], {
      transparency: 0.66, ior: 1.58,
      host: ['#aaa294', '#d6cbb8', '#726d67', '#e6ddc8'],
      describe: 'Pale green hexagonal columns with broad, flat pinacoid terminations.'
    }),
  mica: mineral('Mica', 'KAl2(AlSi3O10)(OH)2', 'Monoclinic', '2-2.5', 'mica', 1.7,
    ['#a18c67', '#ded7b7', '#625c4b', '#bfb398'], {
      shortFormula: 'MUSCOVITE',
      transparency: 0.08, metalness: 0.38, roughness: 0.28, iridescence: 0.18,
      describe: 'Broad pseudohexagonal books with geometrically articulated thin cleavage leaves.'
    }),
  sulfur: mineral('Sulfur', 'S', 'Orthorhombic', '1.5-2.5', 'bipyramidal', 0.35,
    ['#e8ce29', '#fff17a', '#a48c15', '#f4df4e'], {
      transparency: 0.15, ior: 1.95, roughness: 0.29,
      host: ['#8a8070', '#bcb091', '#59584b', '#d7c780'],
      describe: 'Bright lemon-yellow orthorhombic dipyramids with short central prism belts.'
    }),
  malachite: mineral('Malachite', 'Cu2CO3(OH)2', 'Monoclinic', '3.5-4', 'botryoidal', 0.88,
    ['#267e52', '#66b478', '#104c35', '#123f30'], {
      formation: 'cluster', transparency: 0, roughness: 0.22,
      host: ['#695448', '#998168', '#3f3733', '#67a36a'],
      describe: 'Continuous grape-like green aggregates with concentric mineral banding.'
    }),
  azurite: mineral('Azurite', 'Cu3(CO3)2(OH)2', 'Monoclinic', '3.5-4', 'azurite', 0.25,
    ['#2853b4', '#668bd9', '#172865', '#3a73cb'], {
      transparency: 0.1, roughness: 0.24,
      host: ['#715b49', '#a08c6e', '#453b34', '#4e9461'],
      describe: 'Deep azure monoclinic blades on earthy matrix with green carbonate veins.'
    }),
  hematite: mineral('Hematite', 'Fe2O3', 'Trigonal', '5-6.5', 'hematite', 1.1,
    ['#4c5862', '#adbdc8', '#242d36', '#815b51'], {
      formation: 'radiating', transparency: 0, metalness: 0.88, roughness: 0.24,
      describe: 'An iron rose of overlapping, thin metallic basal plates with sharp beveled rims.'
    }),
  magnetite: mineral('Magnetite', 'Fe3O4', 'Cubic', '5.5-6.5', 'octahedral', 0.5,
    ['#39434c', '#899aa6', '#1a232d', '#5d6b79'], {
      transparency: 0, metalness: 0.76, roughness: 0.25,
      describe: 'Black metallic octahedra with eight distinct triangular crystal faces.'
    }),
  feldspar: mineral('Feldspar', 'KAlSi3O8', 'Triclinic', '6', 'feldspar', 0.42,
    ['#d29b88', '#f1ccaf', '#a06e66', '#e4bbaa'], {
      transparency: 0.04, roughness: 0.39,
      describe: 'Salmon microcline: blocky monoclinic-looking profiles, oblique ends, and twin traces.'
    }),
  olivine: mineral('Olivine', '(Mg,Fe)2SiO4', 'Orthorhombic', '6.5-7', 'olivine', 0.35,
    ['#9ba94b', '#dbe38b', '#5a7536', '#bec462'], {
      transparency: 0.69, ior: 1.67,
      host: ['#484c45', '#737c63', '#292f2d', '#aaa780'],
      describe: 'Olive-green short orthorhombic prisms with clipped corners and beveled ends.'
    }),
  apatite: mineral('Apatite', 'Ca5(PO4)3F', 'Hexagonal', '5', 'apatite', 0.29,
    ['#43a6a6', '#a1dfd6', '#286879', '#72bfb4'], {
      transparency: 0.65, ior: 1.63,
      fluorescence: '#eacb7b', fluorescenceStrength: 0.24,
      describe: 'Blue-green hexagonal prisms with a distinct pyramidal bevel around flat ends.'
    }),
  corundum: mineral('Corundum', 'Al2O3', 'Trigonal', '9', 'corundum', 0.37,
    ['#97839f', '#cec0cf', '#5f526e', '#b0a0b8'], {
      transparency: 0.33, ior: 1.76,
      describe: 'Six-sided barrel crystals with tapered ends and geometric growth rings.'
    }),
  aquamarine: mineral('Aquamarine', 'Be3Al2Si6O18', 'Hexagonal', '7.5-8', 'beryl', 0.19,
    ['#76c3d7', '#c8edf0', '#428aa7', '#a5d9df'], {
      transparency: 0.89, ior: 1.58,
      host: ['#aaa294', '#d6cbb8', '#726d67', '#e6ddc8'],
      describe: 'Long, pale blue beryl prisms with crisp flat hexagonal terminations.'
    }),
  emerald: mineral('Emerald', 'Be3Al2Si6O18', 'Hexagonal', '7.5-8', 'beryl', 0.27,
    ['#27895c', '#7bc690', '#15533e', '#50a674'], {
      transparency: 0.54, ior: 1.58,
      host: ['#565958', '#8b9085', '#353b3b', '#d1d4b9'],
      describe: 'Rich green, stout hexagonal beryl columns rooted in contrasting matrix.'
    }),
  ruby: mineral('Ruby', 'Al2O3', 'Trigonal', '9', 'corundum', 0.4,
    ['#b83c69', '#ee92ad', '#742443', '#d66d92'], {
      transparency: 0.46, ior: 1.76,
      fluorescence: '#ff315e', fluorescenceStrength: 0.52,
      host: ['#b5aea3', '#e0d6c6', '#817b75', '#f0e4cf'],
      describe: 'Red corundum barrels with hexagonal ends and a selectable UV-red preview.'
    }),
  sapphire: mineral('Sapphire', 'Al2O3', 'Trigonal', '9', 'corundum', 0.37,
    ['#3e64b6', '#8ea9df', '#253967', '#6585c5'], {
      transparency: 0.62, ior: 1.76,
      describe: 'Blue corundum with tapered hexagonal barrel growth and flat basal faces.'
    }),
  'desert-rose': mineral('Desert rose', 'CaSO4.2H2O', 'Monoclinic', '2', 'bladed', 0.46,
    ['#c6a679', '#e8d1a5', '#8e7455', '#d7bc91'], {
      formation: 'radiating', transparency: 0, roughness: 0.79,
      host: ['#b09a78', '#d6c39d', '#7d715c', '#e2ceaa'],
      describe: 'A sand-colored gypsum rosette of intersecting, thin, beveled mineral blades.'
    })
};

export const catalog = Object.freeze(Object.fromEntries(
  Object.entries(CATALOG_DEFINITIONS).map(([id, definition], index) => [
    id,
    Object.freeze({ id, index: index + 1, ...definition })
  ])
));

const ZONE_KEYS = Object.keys(BASE);
const HABIT_OPTIONS = [
  'natural', 'prismatic', 'cubic', 'hopper', 'octahedral', 'rhombohedral',
  'dodecahedral', 'pyritohedral', 'tabular', 'bladed', 'acicular',
  'bipyramidal', 'barrel', 'botryoidal', 'massive'
];

export const params = {
  mineralType: {
    type: 'choice', default: 'amethyst', options: Object.keys(catalog),
    optionLabels: Object.fromEntries(Object.entries(catalog).map(([k, v]) => [k, v.label])),
    label: 'Mineral / Variety', affects: 'geometry',
    describe: 'Selects one of 31 complete specimens, including characteristic geometry, chemistry, colors, and optical properties.'
  },
  crystalHabit: {
    type: 'choice', default: 'natural', options: HABIT_OPTIONS,
    label: 'Crystal Habit', affects: 'geometry',
    describe: 'Natural follows mineral crystallography. Other choices are explicit geometric study overrides, not claims that every mineral naturally has every habit.'
  },
  formation: {
    type: 'choice', default: 'natural',
    options: ['natural', 'single', 'matrix', 'radiating', 'cluster'],
    label: 'Formation', affects: 'geometry',
    describe: 'Natural uses the catalog recommendation. Single creates one main crystal without host rock or loose shards. Other modes rebuild matrix, radiating, or dense-cluster distributions.'
  },
  clusterDensity: {
    type: 'range', default: 6, min: 1, max: 10, step: 1,
    label: 'Cluster Density', affects: 'geometry',
    describe: 'Recalculates crystal count, spacing, growth hierarchy, and peripheral druse. Single-crystal mode remains one crystal.'
  },
  clarity: {
    type: 'range', default: 0.7, min: 0, max: 1, step: 0.01,
    label: 'Clarity / Surface Polish', affects: 'colors',
    describe: 'Controls physically based transmission, roughness, and clearcoat. Opaque and metallic minerals stay opaque.'
  },
  matrixAmount: {
    type: 'range', default: 0.55, min: 0, max: 1, step: 0.01,
    label: 'Matrix Amount', affects: 'geometry',
    describe: 'Rebuilds host-rock thickness, footprint, exposed veins, and rooted growth positions. Zero removes the matrix. Single formation suppresses it.'
  },
  specimenSize: {
    type: 'range', default: 0.5, min: 0.12, max: 1.2, step: 0.01,
    label: 'Reference Size (m)', affects: 'geometry',
    describe: 'Real-world specimen size reference. Reconstructs all crystal dimensions, profiles, layout coordinates, support geometry, and vector lettering.'
  },
  growthSeed: {
    type: 'range', default: 2718, min: 1, max: 999999, step: 1,
    label: 'Growth Seed', affects: 'geometry',
    describe: 'Deterministic seed for crystal yaw, intergrowth, matrix relief, and fractures.'
  },
  azimuth: {
    type: 'range', default: 0, min: -180, max: 180, step: 1,
    label: 'Specimen Turntable (°)', affects: 'geometry',
    describe: 'Poses the mineral assembly about its Y-axis without rotating the display base or placard.'
  },
  displayBase: {
    type: 'toggle', default: true,
    label: 'Museum Display Base', affects: 'geometry',
    describe: 'Adds a precisely beveled display slab, perimeter inlay, and four small feet.'
  },
  showShards: {
    type: 'toggle', default: true,
    label: 'Loose Cleavage / Fracture Shards', affects: 'geometry',
    describe: 'Adds individually detachable fragments beside the specimen. Automatically suppressed in Single formation.'
  },
  showPlacard: {
    type: 'toggle', default: true,
    label: 'Identification Placard', affects: 'geometry',
    describe: 'Adds an inclined, supported plaque with actual vector geometry for name, formula, crystal system, hardness, and accession number.'
  },
  uvFluorescence: {
    type: 'toggle', default: false,
    label: 'UV Fluorescence Preview', affects: 'colors',
    describe: 'Optional art-directed UV response for selected fluorescent catalog specimens. No mineral emits light by default; real fluorescence varies between specimens.'
  },
  colorway: {
    type: 'choice', default: 'default', options: Object.keys(COLORWAYS),
    label: 'Presentation Colorway', affects: 'colors',
    describe: 'Changes rock/display/paper styling while preserving diagnostic mineral colors.'
  },
  useCustomColors: {
    type: 'toggle', default: false,
    label: 'Use Zone Color Overrides', affects: 'colors',
    describe: 'Enables the color controls below. Disabled by default so editor-provided color defaults do not overwrite the selected mineral palette.'
  },
  mergeForProduction: {
    type: 'toggle', default: false,
    label: 'Merge for Production', affects: 'geometry',
    describe: 'False retains individually selectable meshes. True merges each material into one batch while preserving detachable assemblies and reversible per-part detachment through userData.parts.'
  },
  ...Object.fromEntries(ZONE_KEYS.map(key => [key, {
    type: 'color', default: BASE[key],
    label: `${key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())} Color`,
    affects: 'colors',
    describe: `Explicit ${key} zone override, active when Use Zone Color Overrides is enabled. Zone hex collisions are automatically resolved.`
  }]))
};

export const rig = {
  specimen: {
    axis: 'y', range: [-180, 180], units: 'degrees',
    describe: 'Rotate the complete mineral, matrix, and loose-fragment assembly on the fixed display.'
  }
};

export const detach = ['crystals', 'crystal_001', 'matrix', 'shards', 'placard', 'mount'];

export const night = {
  uvFluorescence: {
    targets: ['crystals', 'shards'],
    property: 'emissiveIntensity',
    range: [0, 0.6],
    default: 0,
    colorSource: 'catalog[mineralType].fluorescence',
    describe: 'Species-dependent illustrative UV preview, controlled at runtime with userData.setUV. This does not add scene lights or imply universal fluorescence.'
  }
};

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pad = n => String(n).padStart(3, '0');

const hexOf = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return value & 0xFFFFFF;
  if (typeof value === 'string' && /^#?[0-9a-f]{6}$/i.test(value)) {
    return parseInt(value.replace('#', ''), 16);
  }
  return null;
};

function zonesFor(name, overrides = {}) {
  const scheme = COLORWAYS[name] || COLORWAYS.default;
  const used = new Set();
  const result = {};
  for (const key of ZONE_KEYS) {
    let hex = (hexOf(overrides[key]) ?? hexOf(scheme[key]) ?? hexOf(BASE[key])) & 0xFFFFFF;
    while (used.has(hex)) hex = (hex + 1) & 0xFFFFFF;
    used.add(hex);
    result[key] = hex;
  }
  return result;
}

function randomFor(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function readParams(input) {
  const supplied = input && typeof input === 'object' ? { ...input } : {};
  const aliases = {
    'rock-crystal': 'quartz', smokyQuartz: 'smoky-quartz',
    roseQuartz: 'rose-quartz', milkyQuartz: 'milky-quartz',
    desertRose: 'desert-rose', selenite: 'gypsum'
  };
  if (aliases[supplied.mineralType]) supplied.mineralType = aliases[supplied.mineralType];
  const output = {};
  for (const [key, schema] of Object.entries(params)) {
    let value = supplied[key] ?? schema.default;
    if (schema.type === 'range') {
      value = Number(value);
      if (!Number.isFinite(value)) value = schema.default;
      value = clamp(value, schema.min, schema.max);
      if (schema.step === 1) value = Math.round(value);
    } else if (schema.type === 'choice') {
      if (!schema.options.includes(value)) value = schema.default;
    } else if (schema.type === 'toggle') {
      if (typeof value !== 'boolean') value = schema.default;
    } else if (schema.type === 'color' && hexOf(value) === null) {
      value = schema.default;
    }
    output[key] = value;
  }
  return output;
}

const MAT = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  flatShading: true,
  roughness: 0.86,
  metalness: 0,
  side: THREE.DoubleSide
});

const GLASS_MAT = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  vertexColors: true,
  flatShading: true,
  roughness: 0.2,
  metalness: 0,
  transmission: 0.35,
  thickness: 0.025,
  ior: 1.55,
  clearcoat: 0.6,
  clearcoatRoughness: 0.13,
  transparent: false,
  opacity: 1,
  side: THREE.FrontSide,
  depthWrite: true
});

/* Source geometries are immutable during batching, making production reversible.
 * A null color preserves the source's procedural, zone-based vertex colors.
 */
function prep(source, hex) {
  const geo = source.index ? source.toNonIndexed() : source.clone();
  const smooth = source.userData.smooth === true;
  for (const key of Object.keys(geo.attributes)) {
    if (!['position', 'color', 'normal'].includes(key)) geo.deleteAttribute(key);
  }
  geo.clearGroups();
  if (hex !== null && hex !== undefined || !geo.getAttribute('color')) {
    const color = new THREE.Color(hex ?? 0xffffff);
    const count = geo.getAttribute('position').count;
    const buffer = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      buffer[i * 3] = color.r;
      buffer[i * 3 + 1] = color.g;
      buffer[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(buffer, 3));
  }
  if (!smooth || !geo.getAttribute('normal')) {
    geo.deleteAttribute('normal');
    geo.computeVertexNormals();
  }
  return geo;
}

function singleMesh(part, material, fallbackName) {
  const geometry = prep(part.g, part.c);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = part.name || fallbackName;
  if (part.transform) mesh.applyMatrix4(part.transform);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = {
    partId: mesh.name,
    semantic: part.meta || {},
    editable: true
  };
  return mesh;
}

function finish(list, material = MAT, name = 'solid', merge = true) {
  if (list.length === 0) return null;
  if (merge) {
    const temporary = [];
    const ranges = [];
    let offset = 0;
    for (let i = 0; i < list.length; i++) {
      const part = list[i];
      const geometry = prep(part.g, part.c);
      if (part.transform) geometry.applyMatrix4(part.transform);
      const count = geometry.getAttribute('position').count;
      ranges.push({
        name: part.name || `${name}_part_${i + 1}`,
        start: offset,
        count,
        firstTriangle: offset / 3,
        triangleCount: count / 3,
        semantic: part.meta || {}
      });
      offset += count;
      temporary.push(geometry);
    }
    const merged = mergeGeometries(temporary, false);
    temporary.forEach(geometry => geometry.dispose());
    if (!merged) throw new Error(`Unable to merge mineral material batch: ${name}`);
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { partRanges: ranges, editable: false, semanticBatch: true };
    return mesh;
  }
  const group = new THREE.Group();
  group.name = name;
  list.forEach((part, index) => {
    group.add(singleMesh(part, material, `${name}_part_${index + 1}`));
  });
  return group;
}

function box(w, h, d, x = 0, y = 0, z = 0) {
  return new THREE.BoxGeometry(w, h, d).translate(x, y, z);
}

function addCylinder(parts, rTop, rBot, h, segs, x, y, z,
  rx = 0, ry = 0, rz = 0, hex = 0x888888, name = 'cylinder') {
  const geometry = new THREE.CylinderGeometry(rTop, rBot, h, segs);
  if (rx) geometry.rotateX(rx);
  if (ry) geometry.rotateY(ry);
  if (rz) geometry.rotateZ(rz);
  geometry.translate(x, y, z);
  parts.push({ g: geometry, c: hex, name });
  return geometry;
}

function addWire(parts, p1, p2, hex, radius = 0.001, radialSegments = 6, name = 'wire') {
  const a = new THREE.Vector3(...p1);
  const b = new THREE.Vector3(...p2);
  const length = a.distanceTo(b);
  if (length < 1e-7) return null;
  const geometry = new THREE.CylinderGeometry(radius, radius, length, radialSegments);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize());
  geometry.applyMatrix4(new THREE.Matrix4().compose(a.lerp(b, 0.5), q, UNIT_SCALE));
  parts.push({ g: geometry, c: hex, name });
  return geometry;
}

function addExtrusion(parts, shape, depth, hex, x = 0, y = 0, z = 0,
  bevel = 0, name = 'extrusion') {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 6,
    bevelEnabled: bevel > 0,
    bevelSegments: 1,
    bevelSize: bevel,
    bevelThickness: bevel
  });
  geometry.translate(x, y, z);
  parts.push({ g: geometry, c: hex, name });
  return geometry;
}

function record(g, name, c = null, transform = null, meta = {}) {
  return { g, c, name, transform, meta };
}

/* Every polygon is triangulated from exact shared corner coordinates.
 * Facet color changes do not perturb or overlap the actual surfaces.
 */
class Facets {
  constructor(colors) {
    this.positions = [];
    this.colors = [];
    this.palette = Object.fromEntries(
      Object.entries(colors).map(([key, value]) => [key, new THREE.Color(value)])
    );
  }
  tri(a, b, c, zone = 'crystal') {
    const zones = Array.isArray(zone) ? zone : [zone, zone, zone];
    [a, b, c].forEach((point, index) => {
      this.positions.push(point[0], point[1], point[2]);
      const color = this.palette[zones[index]] || this.palette.crystal;
      this.colors.push(color.r, color.g, color.b);
    });
  }
  quad(a, b, c, d, zone = 'crystal') {
    if (Array.isArray(zone)) {
      this.tri(a, b, c, [zone[0], zone[1], zone[2]]);
      this.tri(a, c, d, [zone[0], zone[2], zone[3]]);
    } else {
      this.tri(a, b, c, zone);
      this.tri(a, c, d, zone);
    }
  }
  polygon(points, zone = 'crystal', reverse = false) {
    const ordered = reverse ? [...points].reverse() : points;
    for (let i = 1; i < ordered.length - 1; i++) {
      this.tri(ordered[0], ordered[i], ordered[i + 1], zone);
    }
  }
  geometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    return geometry;
  }
}

function regularPolygon(count, phase = 0) {
  return Array.from({ length: count }, (_, i) => {
    const angle = phase + i * TAU / count;
    return [Math.cos(angle), Math.sin(angle)];
  });
}

function bevelPolygon(points, fraction) {
  const result = [];
  for (let i = 0; i < points.length; i++) {
    const previous = points[(i + points.length - 1) % points.length];
    const current = points[i];
    const next = points[(i + 1) % points.length];
    result.push([
      current[0] + (previous[0] - current[0]) * fraction,
      current[1] + (previous[1] - current[1]) * fraction
    ]);
    result.push([
      current[0] + (next[0] - current[0]) * fraction,
      current[1] + (next[1] - current[1]) * fraction
    ]);
  }
  return result;
}

function loft(builder, outline, rings, options = {}) {
  const rows = rings.map(ring => outline.map((point, index) => [
    point[0] * ring.r + (ring.x || 0),
    typeof ring.y === 'function' ? ring.y(index, point) : ring.y,
    point[1] * ring.r * (ring.zRatio ?? 1) + (ring.z || 0)
  ]));
  const n = outline.length;
  for (let row = 0; row < rows.length - 1; row++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const zone = options.zone
        ? options.zone(row, i)
        : (rings[row + 1].zone || (i % 6 === 3 ? 'shadow' : 'crystal'));
      builder.quad(rows[row][i], rows[row + 1][i], rows[row + 1][j], rows[row][j], zone);
    }
  }
  const average = row => row.reduce(
    (sum, point) => sum.map((value, i) => value + point[i] / row.length),
    [0, 0, 0]
  );
  if (options.bottom !== false) {
    const center = average(rows[0]);
    for (let i = 0; i < n; i++) {
      builder.tri(center, rows[0][i], rows[0][(i + 1) % n], options.bottomZone || 'band');
    }
  }
  const last = rows[rows.length - 1];
  if (options.point) {
    for (let i = 0; i < n; i++) {
      builder.tri(last[i], options.point, last[(i + 1) % n],
        i % 3 === 1 ? ['crystal', 'tip', 'crystal'] : (i % 3 === 2 ? 'shadow' : 'tip'));
    }
  } else if (options.top !== false) {
    const center = average(last);
    for (let i = 0; i < n; i++) {
      builder.tri(center, last[(i + 1) % n], last[i], options.topZone || 'tip');
    }
  }
  return rows;
}

/* Intersection of convex half-spaces. Used for actual cubic, octahedral,
 * rhombic-dodecahedral and pyritohedral topology, rather than sphere substitutes.
 */
function convexSolid(planes) {
  const normals = planes.map(p => new THREE.Vector3(p[0], p[1], p[2]));
  const vertices = [];
  for (let i = 0; i < planes.length - 2; i++) {
    for (let j = i + 1; j < planes.length - 1; j++) {
      for (let k = j + 1; k < planes.length; k++) {
        const crossJK = new THREE.Vector3().crossVectors(normals[j], normals[k]);
        const determinant = normals[i].dot(crossJK);
        if (Math.abs(determinant) < 1e-9) continue;
        const point = crossJK.multiplyScalar(planes[i][3])
          .add(new THREE.Vector3().crossVectors(normals[k], normals[i]).multiplyScalar(planes[j][3]))
          .add(new THREE.Vector3().crossVectors(normals[i], normals[j]).multiplyScalar(planes[k][3]))
          .divideScalar(determinant);
        if (planes.some((plane, index) => normals[index].dot(point) > plane[3] + 1e-7)) continue;
        if (!vertices.some(vertex => vertex.distanceToSquared(point) < 1e-12)) vertices.push(point);
      }
    }
  }
  const faces = [];
  planes.forEach((plane, index) => {
    const normal = normals[index].clone().normalize();
    const ids = [];
    vertices.forEach((point, vertexIndex) => {
      if (Math.abs(normals[index].dot(point) - plane[3]) < 1e-6) ids.push(vertexIndex);
    });
    if (ids.length < 3) return;
    const center = new THREE.Vector3();
    ids.forEach(id => center.add(vertices[id]));
    center.divideScalar(ids.length);
    const reference = Math.abs(normal.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(reference, normal).normalize();
    const v = new THREE.Vector3().crossVectors(normal, u);
    ids.sort((a, b) => {
      const pa = vertices[a].clone().sub(center);
      const pb = vertices[b].clone().sub(center);
      return Math.atan2(pa.dot(v), pa.dot(u)) - Math.atan2(pb.dot(v), pb.dot(u));
    });
    faces.push({ ids, normal: normal.toArray() });
  });
  return { vertices: vertices.map(v => v.toArray()), faces };
}

const SOLID_CACHE = new Map();

function solidTemplate(kind) {
  if (SOLID_CACHE.has(kind)) return SOLID_CACHE.get(kind);
  let result;
  const signs = [-1, 1];
  const planes = [];
  if (kind === 'cubic') {
    for (let axis = 0; axis < 3; axis++) {
      for (const sign of signs) {
        const normal = [0, 0, 0, 1];
        normal[axis] = sign;
        planes.push(normal);
      }
    }
    for (let a = 0; a < 3; a++) {
      for (let b = a + 1; b < 3; b++) {
        for (const sa of signs) for (const sb of signs) {
          const normal = [0, 0, 0, 1.955];
          normal[a] = sa;
          normal[b] = sb;
          planes.push(normal);
        }
      }
    }
    for (const x of signs) for (const y of signs) for (const z of signs) {
      planes.push([x, y, z, 2.91]);
    }
    result = convexSolid(planes);
  } else if (kind === 'dodecahedral') {
    for (let a = 0; a < 3; a++) {
      for (let b = a + 1; b < 3; b++) {
        for (const sa of signs) for (const sb of signs) {
          const normal = [0, 0, 0, 1];
          normal[a] = sa;
          normal[b] = sb;
          planes.push(normal);
        }
      }
    }
    result = convexSolid(planes);
  } else if (kind === 'octahedral') {
    for (const x of signs) for (const y of signs) for (const z of signs) {
      planes.push([x, y, z, 1]);
    }
    result = convexSolid(planes);
  } else if (kind === 'pyritohedral') {
    const t = 1.45;
    for (const a of signs) for (const b of signs) {
      planes.push([a, b * t, 0, t], [0, a, b * t, t], [b * t, 0, a, t]);
    }
    result = convexSolid(planes);
  } else if (kind === 'rhombohedral') {
    const c = Math.cos(74.7 * Math.PI / 180);
    const s = Math.sqrt(1 - c * c);
    const cz = (c - c * c) / s;
    const cy = Math.sqrt(1 - c * c - cz * cz);
    const vertices = [];
    for (const z of [0, 1]) for (const y of [0, 1]) for (const x of [0, 1]) {
      vertices.push([x + y * c + z * c, z * cy, y * s + z * cz]);
    }
    const ids = [
      [0, 1, 3, 2], [4, 6, 7, 5],
      [0, 4, 5, 1], [2, 3, 7, 6],
      [0, 2, 6, 4], [1, 5, 7, 3]
    ];
    const center = vertices.reduce((sum, v) => sum.map((a, i) => a + v[i] / 8), [0, 0, 0]);
    result = {
      vertices,
      faces: ids.map(face => {
        let points = face.map(id => new THREE.Vector3(...vertices[id]));
        let normal = new THREE.Vector3().subVectors(points[1], points[0])
          .cross(new THREE.Vector3().subVectors(points[2], points[0])).normalize();
        const faceCenter = points.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(0.25);
        if (normal.dot(faceCenter.sub(new THREE.Vector3(...center))) < 0) {
          face = [...face].reverse();
          normal.negate();
        }
        return { ids: face, normal: normal.toArray() };
      })
    };
  } else {
    throw new Error(`Unknown convex crystal topology: ${kind}`);
  }
  SOLID_CACHE.set(kind, result);
  return result;
}

function appendSolid(builder, solid, height, radius, kind, isotropic = false) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  solid.vertices.forEach(v => v.forEach((x, i) => {
    min[i] = Math.min(min[i], x);
    max[i] = Math.max(max[i], x);
  }));
  const spanY = max[1] - min[1];
  const spanXZ = Math.max(max[0] - min[0], max[2] - min[2]);
  const factorXZ = isotropic ? height / spanY : radius * 2 / spanXZ;
  const vertices = solid.vertices.map(v => [
    (v[0] - (min[0] + max[0]) / 2) * factorXZ,
    (v[1] - min[1]) * height / spanY,
    (v[2] - (min[2] + max[2]) / 2) * factorXZ
  ]);
  solid.faces.forEach((face, index) => {
    const axial = Math.max(...face.normal.map(Math.abs));
    const zone = kind === 'cubic' && axial < 0.99
      ? 'tip'
      : (index % 7 === 3 ? 'shadow' : (index % 5 === 0 ? 'tip' : 'crystal'));
    builder.polygon(face.ids.map(id => vertices[id]), zone);
  });
}

function addPrismStriae(builder, outline, height, radius, rng) {
  for (let face = 0; face < outline.length; face += 2) {
    const a = outline[face];
    const b = outline[(face + 1) % outline.length];
    const normal = new THREE.Vector2(a[0] + b[0], a[1] + b[1]).normalize();
    const offset = radius * 0.0018;
    for (let line = 0; line < 4; line++) {
      if (rng() < 0.23) continue;
      const y = height * (0.16 + line * 0.115 + rng() * 0.025);
      const width = height * 0.0015;
      const point = (t, yy) => [
        (a[0] + (b[0] - a[0]) * t) * radius + normal.x * offset,
        yy,
        (a[1] + (b[1] - a[1]) * t) * radius + normal.y * offset
      ];
      builder.quad(point(0.13, y), point(0.13, y + width),
        point(0.87, y + width), point(0.87, y), line % 2 ? 'band' : 'tip');
    }
  }
}

function addCubeMarks(builder, height, radius, style) {
  const epsilon = height * 0.0007;
  const point = (face, u, v, lift = 0) => {
    if (face === 0) return [u, height + epsilon + lift, v];
    if (face === 1) return [u, v + height / 2, radius + epsilon + lift];
    return [radius + epsilon + lift, v + height / 2, -u];
  };
  if (style === 'fluorite') {
    for (let face = 0; face < 2; face++) {
      for (const [fraction, zone] of [[0.7, 'tip'], [0.4, 'band']]) {
        const a = radius * fraction;
        const b = a - radius * 0.035;
        const outer = [[-a, -a], [a, -a], [a, a], [-a, a]];
        const inner = [[-b, -b], [b, -b], [b, b], [-b, b]];
        for (let i = 0; i < 4; i++) {
          const j = (i + 1) % 4;
          builder.quad(point(face, ...outer[i]), point(face, ...inner[i]),
            point(face, ...inner[j]), point(face, ...outer[j]), zone);
        }
      }
    }
  } else if (style === 'pyrite' || style === 'galena') {
    const count = style === 'pyrite' ? 8 : 4;
    for (let face = 0; face < 3; face++) {
      for (let line = 0; line < count; line++) {
        const position = radius * (-0.7 + 1.4 * (line + 0.5) / count);
        const width = radius * (style === 'pyrite' ? 0.012 : 0.022);
        const p = (along, across, lift = 0) => face === 1
          ? point(face, across, along, lift)
          : point(face, along, across, lift);
        const left = -radius * 0.76;
        const right = radius * 0.76;
        builder.quad(p(left, position - width), p(left, position, radius * 0.003),
          p(right, position, radius * 0.003), p(right, position - width), 'shadow');
        builder.quad(p(left, position, radius * 0.003), p(left, position + width),
          p(right, position + width), p(right, position, radius * 0.003), 'tip');
      }
    }
  }
}

function appendBlade(builder, height, radius, thickRatio, mineralId) {
  const bevel = Math.min(radius * 0.035, height * 0.008);
  const h = height - bevel * 2;
  const shape = new THREE.Shape();
  shape.moveTo(-radius * 0.58, 0);
  shape.lineTo(-radius * 0.96, h * 0.08);
  shape.lineTo(-radius * 0.8, h * 0.77);
  shape.lineTo(radius * 0.24, h);
  shape.lineTo(radius * 0.95, h * 0.8);
  shape.lineTo(radius * 0.7, h * 0.11);
  shape.lineTo(radius * 0.15, 0);
  shape.closePath();
  const depth = radius * thickRatio;
  const source = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelSize: bevel,
    bevelThickness: bevel, bevelSegments: 1, steps: 1, curveSegments: 1
  });
  source.translate(0, bevel, -depth / 2);
  const geo = source.index ? source.toNonIndexed() : source;
  const positions = geo.getAttribute('position');
  for (let i = 0; i < positions.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(positions, i);
    const b = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(positions, i + 2);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const zone = Math.abs(normal.z) > 0.98 ? 'crystal'
      : (normal.x < -0.35 ? 'shadow' : 'tip');
    builder.tri(a.toArray(), b.toArray(), c.toArray(), zone);
  }
  if (mineralId !== 'desert-rose') {
    for (let i = 0; i < 3; i++) {
      const x = radius * (-0.45 + i * 0.35);
      const z = depth / 2 + bevel + height * 0.0005;
      builder.quad([x, height * 0.15, z], [x + radius * 0.012, height * 0.15, z],
        [x + radius * 0.065, height * 0.71, z], [x + radius * 0.05, height * 0.71, z], 'band');
    }
  }
  if (geo !== source) geo.dispose();
  source.dispose();
}

function massiveSolid(rng) {
  const ico = new THREE.IcosahedronGeometry(1, 0);
  const positions = ico.getAttribute('position');
  const planes = [];
  for (let i = 0; i < positions.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(positions, i);
    const b = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(positions, i + 2);
    const normal = b.sub(a).cross(c.sub(a)).normalize();
    planes.push([normal.x, normal.y, normal.z, 0.9 + rng() * 0.19]);
  }
  ico.dispose();
  planes.push([0, -1, 0, 0.69]);
  return convexSolid(planes);
}

function smoothMaximum(a, b, amount) {
  const t = clamp(0.5 + 0.5 * (b - a) / amount, 0, 1);
  return a * (1 - t) + b * t + amount * t * (1 - t);
}

/* A connected analytic envelope of hemispherical growth lobes, sampled directly
 * as a watertight polar surface. There is no voxel field or stack of spheres.
 */
function botryoidalGeometry(height, radius, colors, rng, small = false, banded = false) {
  const angular = small ? 28 : 44;
  const radial = small ? 8 : 14;
  const lobes = [{ x: 0, z: 0, r: 0.56 }];
  const lobeCount = small ? 4 : 7;
  for (let i = 0; i < lobeCount; i++) {
    const angle = TAU * i / lobeCount + rng() * 0.24;
    const distance = 0.36 + rng() * 0.21;
    lobes.push({
      x: Math.cos(angle) * distance,
      z: Math.sin(angle) * distance,
      r: 0.29 + rng() * 0.17
    });
  }
  const sample = (x, z) => {
    const rho = Math.hypot(x, z);
    let value = 0.12 + 0.08 * (1 - rho * rho);
    let best = -Infinity;
    let ring = rho;
    for (const lobe of lobes) {
      const distance = Math.hypot(x - lobe.x, z - lobe.z);
      const cap = 0.12 + Math.sqrt(Math.max(0, lobe.r * lobe.r - distance * distance)) * 1.22;
      value = smoothMaximum(value, cap, 0.09);
      if (cap > best) {
        best = cap;
        ring = distance / lobe.r;
      }
    }
    value *= 1 - 0.16 * Math.pow(rho, 8);
    return { y: height * value / 0.84, ring };
  };
  const positions = [];
  const colorBuffer = [];
  const indices = [];
  const colorMap = Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, new THREE.Color(v)]));
  const addVertex = (x, y, z, zone) => {
    positions.push(x, y, z);
    const c = colorMap[zone];
    colorBuffer.push(c.r, c.g, c.b);
    return positions.length / 3 - 1;
  };
  const centerSample = sample(0, 0);
  addVertex(0, centerSample.y, 0, 'crystal');
  const rings = [];
  for (let r = 1; r <= radial; r++) {
    const ids = [];
    const rho = r / radial;
    for (let i = 0; i < angular; i++) {
      const angle = i * TAU / angular;
      const x = Math.cos(angle) * rho;
      const z = Math.sin(angle) * rho;
      const surface = sample(x, z);
      const wave = Math.sin(surface.ring * 28);
      const zone = banded
        ? (wave > 0.52 ? 'tip' : wave < -0.38 ? 'band' : 'crystal')
        : (surface.y > height * 0.67 ? 'tip' : 'crystal');
      ids.push(addVertex(x * radius, surface.y, z * radius * 0.83, zone));
    }
    rings.push(ids);
  }
  for (let i = 0; i < angular; i++) {
    const j = (i + 1) % angular;
    indices.push(0, rings[0][j], rings[0][i]);
  }
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < angular; i++) {
      const j = (i + 1) % angular;
      indices.push(rings[r][i], rings[r][j], rings[r + 1][j]);
      indices.push(rings[r][i], rings[r + 1][j], rings[r + 1][i]);
    }
  }
  const bottom = [];
  for (let i = 0; i < angular; i++) {
    const angle = i * TAU / angular;
    bottom.push(addVertex(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * 0.83, 'shadow'));
  }
  const bottomCenter = addVertex(0, 0, 0, 'shadow');
  const outer = rings[rings.length - 1];
  for (let i = 0; i < angular; i++) {
    const j = (i + 1) % angular;
    indices.push(outer[i], bottom[i], bottom[j], outer[i], bottom[j], outer[j]);
    indices.push(bottomCenter, bottom[i], bottom[j]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorBuffer, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.smooth = true;
  return geometry;
}

function crystalGeometry(kind, height, radius, colors, rng, mineralInfo, small = false) {
  if (kind === 'botryoidal') {
    return botryoidalGeometry(height, radius, colors, rng, small, mineralInfo.id === 'malachite');
  }
  const builder = new Facets(colors);
  const hex = regularPolygon(6, Math.PI / 6);
  const square = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

  if (['cubic', 'octahedral', 'dodecahedral', 'pyritohedral', 'rhombohedral'].includes(kind)) {
    appendSolid(builder, solidTemplate(kind), height, radius, kind, kind === 'rhombohedral');
    if (kind === 'cubic' && !small) addCubeMarks(builder, height, radius, mineralInfo.id);
  } else if (kind === 'hopper') {
    const profile = [
      [0, 0.97], [0.05, 1], [1, 1], [1, 0.84],
      [0.83, 0.84], [0.83, 0.67], [0.63, 0.67],
      [0.63, 0.48], [0.4, 0.48], [0.4, 0.25], [0.2, 0.25]
    ];
    loft(builder, square, profile.map(([y, r]) => ({ y: y * height, r: r * radius })), {
      zone: (row, face) => row < 2
        ? (face === 2 ? 'shadow' : 'crystal')
        : (row % 2 ? 'tip' : 'band'),
      topZone: 'shadow'
    });
  } else if (kind === 'bladed' || kind === 'azurite') {
    const thickness = kind === 'azurite' ? 0.68 : mineralInfo.id === 'desert-rose' ? 0.15 : 0.23;
    appendBlade(builder, height, radius, thickness, mineralInfo.id);
  } else if (kind === 'tourmaline') {
    const outline = bevelPolygon(regularPolygon(3, Math.PI / 6), 0.12);
    const grooved = [];
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const divisions = length > 0.7 ? 6 : 1;
      for (let j = 0; j < divisions; j++) {
        const t = j / divisions;
        const indentation = j % 2 ? 0.975 : 1;
        grooved.push([
          (a[0] + (b[0] - a[0]) * t) * indentation,
          (a[1] + (b[1] - a[1]) * t) * indentation
        ]);
      }
    }
    loft(builder, grooved, [
      { y: 0, r: radius * 0.92 },
      { y: height * 0.045, r: radius },
      { y: height * 0.91, r: radius * 0.965 },
      { y: height, r: radius * 0.86 },
      { y: height, r: radius * 0.72 },
      { y: height, r: radius * 0.61 }
    ], {
      zone: (row, face) => row === 4 ? 'band' : row === 3 ? 'crystal'
        : (face % 5 === 2 ? 'shadow' : 'crystal'),
      topZone: 'core'
    });
  } else if (kind === 'beryl' || kind === 'apatite') {
    const shoulder = kind === 'apatite' ? 0.83 : 0.955;
    loft(builder, hex, [
      { y: 0, r: radius * 0.9 },
      { y: height * 0.035, r: radius },
      { y: height * shoulder, r: radius * 0.985 },
      { y: height, r: radius * (kind === 'apatite' ? 0.72 : 0.88) }
    ], {
      zone: (row, face) => row === 0 ? 'band'
        : row === 2 ? 'tip' : face % 3 === 1 ? 'shadow' : 'crystal',
      topZone: 'tip'
    });
    if (!small) addPrismStriae(builder, hex, height * 0.95, radius * 0.985, rng);
  } else if (kind === 'mica' || kind === 'tabular' || kind === 'hematite') {
    const outline = regularPolygon(kind === 'hematite' ? 8 : 6, Math.PI / 6)
      .map(([x, z]) => [x + z * 0.1, z * (kind === 'hematite' ? 0.87 : 0.76)]);
    const rings = [];
    const layers = kind === 'mica' ? (small ? 5 : 11) : kind === 'hematite' ? 3 : 4;
    for (let layer = 0; layer <= layers; layer++) {
      const t = layer / layers;
      const profile = kind === 'hematite' ? 0.8 + 0.2 * Math.sin(Math.PI * t) : 0.95 + 0.045 * Math.sin(t * 3.1);
      rings.push({ y: height * t, r: radius * profile, x: radius * 0.035 * t });
      if (layer < layers) {
        rings.push({
          y: height * (t + 0.32 / layers),
          r: radius * (profile - (kind === 'mica' ? 0.032 : 0.018)),
          x: radius * 0.035 * t
        });
      }
    }
    loft(builder, outline, rings, {
      zone: (row, face) => row % 2 === 0 ? 'shadow' : face % 3 ? 'crystal' : 'tip',
      topZone: kind === 'hematite' ? 'crystal' : 'band'
    });
  } else if (kind === 'bipyramidal') {
    const outline = [[1, 0], [0, 0.73], [-1, 0], [0, -0.73]];
    loft(builder, outline, [
      { y: 0, r: radius * 0.08 },
      { y: height * 0.37, r: radius },
      { y: height * 0.54, r: radius },
      { y: height * 0.87, r: radius * 0.28 }
    ], { point: [radius * 0.015, height, 0] });
  } else if (kind === 'corundum') {
    const rings = [];
    const rows = small ? 6 : 12;
    for (let i = 0; i <= rows; i++) {
      const t = i / rows;
      const profile = 0.66 + 0.34 * Math.sin(Math.PI * t);
      rings.push({ y: t * height, r: radius * profile });
      if (!small && i > 0 && i < rows) {
        rings.push({ y: (t + 0.012) * height, r: radius * (profile - 0.013) });
      }
    }
    loft(builder, hex, rings, {
      zone: (row, face) => row % 4 === 1 ? 'band' : face % 3 === 2 ? 'shadow' : 'crystal',
      topZone: 'tip'
    });
  } else if (kind === 'feldspar') {
    const outline = bevelPolygon(square, 0.09);
    loft(builder, outline, [
      { y: 0, r: radius * 0.94, zRatio: 0.65 },
      { y: height * 0.07, r: radius, zRatio: 0.65 },
      { y: (i, point) => height * (0.93 + point[0] * 0.07), r: radius * 0.96, zRatio: 0.65, x: radius * 0.2 }
    ], {
      zone: (row, face) => face % 3 === 1 ? 'shadow' : row === 0 ? 'band' : 'crystal',
      topZone: 'tip'
    });
    const z = radius * 0.651;
    builder.quad([-radius * 0.08, height * 0.08, z], [-radius * 0.057, height * 0.08, z],
      [radius * 0.165, height * 0.91, z], [radius * 0.14, height * 0.91, z], 'band');
  } else if (kind === 'olivine') {
    const outline = bevelPolygon(square.map(([x, z]) => [x, z * 0.66]), 0.23);
    loft(builder, outline, [
      { y: 0, r: radius * 0.42 },
      { y: height * 0.19, r: radius },
      { y: height * 0.74, r: radius },
      { y: height, r: radius * 0.48 }
    ], {
      zone: (row, face) => row === 2 ? 'tip' : face % 4 === 2 ? 'shadow' : 'crystal',
      topZone: 'band'
    });
  } else if (kind === 'massive') {
    appendSolid(builder, massiveSolid(rng), height, radius, 'massive');
  } else {
    const needle = kind === 'acicular';
    const outline = hex;
    loft(builder, outline, [
      { y: 0, r: radius * 0.88 },
      { y: height * 0.04, r: radius },
      {
        y: i => height * (needle ? 0.89 : 0.69 + (i % 2) * 0.055),
        r: radius * (needle ? 0.8 : 1)
      }
    ], {
      zone: (row, face) => row === 0 ? 'band'
        : ['band', face % 3 === 2 ? 'shadow' : 'crystal',
          face % 3 === 2 ? 'shadow' : 'crystal', 'band'],
      point: [radius * 0.075, height, radius * 0.025]
    });
    if (!small && !needle) addPrismStriae(builder, outline, height, radius, rng);
  }
  return builder.geometry();
}

function shardGeometry(kind, height, radius, colors, rng, mineralInfo) {
  if (['cubic', 'hopper', 'rhombohedral', 'dodecahedral', 'octahedral'].includes(kind)) {
    return crystalGeometry(kind === 'hopper' ? 'cubic' : kind, height, radius, colors, rng, mineralInfo, true);
  }
  if (['mica', 'tabular', 'hematite', 'bladed', 'azurite'].includes(kind)) {
    return crystalGeometry(kind, height, radius, colors, rng, mineralInfo, true);
  }
  const builder = new Facets(colors);
  const outline = regularPolygon(5, 0.17).map(([x, z]) => {
    const variation = 0.76 + rng() * 0.24;
    return [x * variation, z * variation];
  });
  loft(builder, outline, [
    { y: 0, r: radius * 0.67 },
    { y: height * 0.15, r: radius },
    { y: (i, point) => height * (0.82 + point[0] * 0.18), r: radius * 0.87 }
  ], {
    zone: (row, face) => face % 3 === 1 ? 'shadow' : 'crystal',
    topZone: 'band'
  });
  return builder.geometry();
}

/* A hollow-free, closed geological solid with a sampled surface; unlike a box,
 * the same height function also places crystal roots and draped mineral veins.
 */
function makeMatrix(size, amount, baseY, colors, seed) {
  const rx = size * (0.29 + 0.19 * Math.sqrt(amount));
  const rz = size * (0.205 + 0.1 * Math.sqrt(amount));
  const height = amount > 0 ? size * (0.035 + 0.13 * amount) : 0;
  const centerZ = -size * 0.11;
  const phase = (seed % 997) * 0.013;
  const boundary = angle => 1 + 0.058 * Math.sin(angle * 3 + phase)
    + 0.032 * Math.cos(angle * 7 - phase * 0.6);
  const surfaceAt = (x, z) => {
    if (amount <= 0) return baseY;
    const nx = x / rx;
    const nz = (z - centerZ) / rz;
    const angle = Math.atan2(nz, nx);
    const rho = clamp(Math.hypot(nx, nz) / boundary(angle), 0, 1);
    const relief = 0.22 + 0.78 * Math.sqrt(Math.max(0, 1 - rho * rho));
    const noise = 0.038 * Math.sin(nx * 13 + phase) * Math.sin(nz * 11 - phase) * rho;
    return baseY + height * (relief + noise);
  };
  const parts = [];
  if (amount <= 0) return { parts, rx, rz, height, centerZ, boundary, surfaceAt };
  const builder = new Facets(colors);
  const angular = 40;
  const center = [0, surfaceAt(0, centerZ), centerZ];
  const rings = [0.19, 0.39, 0.59, 0.77, 0.91, 1].map(fraction =>
    Array.from({ length: angular }, (_, i) => {
      const angle = i * TAU / angular;
      const r = fraction * boundary(angle);
      const x = Math.cos(angle) * rx * r;
      const z = centerZ + Math.sin(angle) * rz * r;
      return [x, surfaceAt(x, z), z];
    })
  );
  const zoneAt = (point, tier) => {
    const variation = Math.sin(point[0] / size * 43 + phase)
      + Math.cos(point[2] / size * 37 - phase);
    return tier > 4 ? 'matrixDark' : variation > 0.65 ? 'matrixLight' : 'matrix';
  };
  for (let i = 0; i < angular; i++) {
    builder.tri(center, rings[0][(i + 1) % angular], rings[0][i], zoneAt(rings[0][i], 0));
  }
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < angular; i++) {
      const j = (i + 1) % angular;
      builder.tri(rings[r][i], rings[r][j], rings[r + 1][j], zoneAt(rings[r][i], r));
      builder.tri(rings[r][i], rings[r + 1][j], rings[r + 1][i], zoneAt(rings[r + 1][i], r));
    }
  }
  const outer = rings[rings.length - 1];
  const bottom = outer.map(point => [point[0] * 0.93, baseY, centerZ + (point[2] - centerZ) * 0.93]);
  for (let i = 0; i < angular; i++) {
    const j = (i + 1) % angular;
    builder.quad(outer[i], bottom[i], bottom[j], outer[j], i % 5 === 0 ? 'matrixLight' : 'matrixDark');
    builder.tri([0, baseY, centerZ], bottom[i], bottom[j], 'matrixDark');
  }
  parts.push(record(builder.geometry(), 'matrix_body', null, null, { role: 'host-rock' }));

  const veinCount = 1 + Math.round(amount * 3);
  for (let vein = 0; vein < veinCount; vein++) {
    const veinBuilder = new Facets(colors);
    const points = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = rx * (-0.83 + 1.66 * t);
      const z = centerZ + rz * ((vein - (veinCount - 1) / 2) * 0.3
        + Math.sin(t * 5.2 + vein * 1.4 + phase) * 0.09);
      points.push([x, z]);
    }
    for (let i = 0; i < steps; i++) {
      const a = points[i], b = points[i + 1];
      const tangent = new THREE.Vector2(b[0] - a[0], b[1] - a[1]).normalize();
      const width = size * (0.0012 + 0.00065 * Math.sin(i * 0.8 + vein) ** 2);
      const vertex = (point, sign) => {
        const x = point[0] - tangent.y * width * sign;
        const z = point[1] + tangent.x * width * sign;
        return [x, surfaceAt(x, z) + size * 0.0005, z];
      };
      veinBuilder.quad(vertex(a, 1), vertex(b, 1), vertex(b, -1), vertex(a, -1), 'vein');
    }
    parts.push(record(veinBuilder.geometry(), `matrix_vein_${pad(vein + 1)}`, null, null, { role: 'host-vein' }));
  }
  return { parts, rx, rz, height, centerZ, boundary, surfaceAt };
}

function roundedOutline(width, depth, radius, segments = 6, inset = 0) {
  const w = width / 2 - inset;
  const d = depth / 2 - inset;
  const r = Math.max(radius - inset, radius * 0.1);
  const result = [];
  const centers = [[w - r, d - r], [-w + r, d - r], [-w + r, -d + r], [w - r, -d + r]];
  for (let corner = 0; corner < 4; corner++) {
    for (let i = 0; i <= segments; i++) {
      const angle = corner * Math.PI / 2 + i * Math.PI / (2 * segments);
      result.push([
        centers[corner][0] + Math.cos(angle) * r,
        centers[corner][1] + Math.sin(angle) * r
      ]);
    }
  }
  return result;
}

function buildMount(size, colors) {
  const parts = [];
  const width = size * 1.32;
  const depth = size;
  const feetHeight = size * 0.008;
  const slabHeight = size * 0.04;
  const top = feetHeight + slabHeight;
  const bevel = size * 0.005;
  const cornerRadius = size * 0.052;
  const builder = new Facets(colors);
  const ringSpecs = [
    [feetHeight, bevel], [feetHeight + bevel, 0],
    [top - bevel, 0], [top, bevel]
  ];
  const rings = ringSpecs.map(([y, inset]) =>
    roundedOutline(width, depth, cornerRadius, 6, inset).map(([x, z]) => [x, y, z]));
  const count = rings[0].length;
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      builder.quad(rings[ring][i], rings[ring + 1][i], rings[ring + 1][j], rings[ring][j], 'mount');
    }
  }
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    builder.tri([0, feetHeight, 0], rings[0][i], rings[0][j], 'mount');
    builder.tri([0, top, 0], rings[3][j], rings[3][i], 'mount');
  }
  parts.push(record(builder.geometry(), 'mount_slab'));
  const inlay = new Facets(colors);
  const outer = roundedOutline(width, depth, cornerRadius, 6, size * 0.015);
  const inner = roundedOutline(width, depth, cornerRadius, 6, size * 0.017);
  for (let i = 0; i < outer.length; i++) {
    const j = (i + 1) % outer.length;
    const v = p => [p[0], top + size * 0.00012, p[1]];
    inlay.quad(v(outer[i]), v(inner[i]), v(inner[j]), v(outer[j]), 'trim');
  }
  parts.push(record(inlay.geometry(), 'mount_inlay'));
  let foot = 0;
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    addCylinder(parts, size * 0.023, size * 0.026, feetHeight, 12,
      x * size * 0.535, feetHeight / 2, z * size * 0.39,
      0, 0, 0, colors.mount, `mount_foot_${pad(++foot)}`);
  }
  return { parts, top };
}

/* Compact vector stroke alphabet. Curved letters use continuous polylines,
 * never bitmap pixels, external fonts, canvas textures, or a FontLoader.
 */
const FONT = {
  A: [[0,0, 0.5,1, 1,0], [0.2,0.4, 0.8,0.4]],
  B: [[0,0, 0,1, 0.65,1, 0.94,0.83, 0.94,0.65, 0.65,0.5, 0,0.5],
      [0.65,0.5, 1,0.34, 1,0.16, 0.68,0, 0,0]],
  C: [[1,0.84, 0.76,1, 0.28,1, 0,0.74, 0,0.25, 0.28,0, 0.76,0, 1,0.17]],
  D: [[0,0, 0,1, 0.55,1, 0.9,0.78, 1,0.5, 0.9,0.22, 0.55,0, 0,0]],
  E: [[1,1, 0,1, 0,0, 1,0], [0,0.51, 0.79,0.51]],
  F: [[0,0, 0,1, 1,1], [0,0.52, 0.79,0.52]],
  G: [[1,0.83, 0.75,1, 0.27,1, 0,0.73, 0,0.25, 0.27,0, 0.77,0, 1,0.24, 1,0.48, 0.55,0.48]],
  H: [[0,0, 0,1], [1,0, 1,1], [0,0.5, 1,0.5]],
  I: [[0,1, 1,1], [0.5,1, 0.5,0], [0,0, 1,0]],
  J: [[0,0.2, 0.22,0, 0.63,0, 0.85,0.24, 0.85,1], [0.4,1, 1,1]],
  K: [[0,0, 0,1], [1,1, 0,0.46, 1,0]],
  L: [[0,1, 0,0, 1,0]],
  M: [[0,0, 0,1, 0.5,0.4, 1,1, 1,0]],
  N: [[0,0, 0,1, 1,0, 1,1]],
  O: [[0.28,0, 0,0.25, 0,0.75, 0.28,1, 0.72,1, 1,0.75, 1,0.25, 0.72,0, 0.28,0]],
  P: [[0,0, 0,1, 0.7,1, 1,0.8, 1,0.61, 0.7,0.44, 0,0.44]],
  Q: [[0.28,0, 0,0.25, 0,0.75, 0.28,1, 0.72,1, 1,0.75, 1,0.25, 0.72,0, 0.28,0], [0.58,0.28, 1.08,-0.1]],
  R: [[0,0, 0,1, 0.7,1, 1,0.8, 1,0.61, 0.7,0.45, 0,0.45], [0.57,0.45, 1,0]],
  S: [[1,0.82, 0.75,1, 0.25,1, 0,0.8, 0,0.65, 0.25,0.52, 0.76,0.46, 1,0.3, 1,0.17, 0.75,0, 0.25,0, 0,0.18]],
  T: [[0,1, 1,1], [0.5,1, 0.5,0]],
  U: [[0,1, 0,0.24, 0.25,0, 0.75,0, 1,0.24, 1,1]],
  V: [[0,1, 0.5,0, 1,1]],
  W: [[0,1, 0.22,0, 0.5,0.62, 0.78,0, 1,1]],
  X: [[0,0, 1,1], [0,1, 1,0]],
  Y: [[0,1, 0.5,0.52, 1,1], [0.5,0.52, 0.5,0]],
  Z: [[0,1, 1,1, 0,0, 1,0]],
  '0': [[0.25,0, 0,0.25, 0,0.75, 0.25,1, 0.75,1, 1,0.75, 1,0.25, 0.75,0, 0.25,0]],
  '1': [[0.15,0.75, 0.55,1, 0.55,0], [0.15,0, 0.95,0]],
  '2': [[0,0.78, 0.24,1, 0.74,1, 1,0.77, 1,0.6, 0,0, 1,0]],
  '3': [[0,0.85, 0.25,1, 0.74,1, 1,0.8, 0.75,0.52, 0.38,0.5],
        [0.75,0.52, 1,0.28, 1,0.16, 0.74,0, 0.25,0, 0,0.18]],
  '4': [[0.8,0, 0.8,1, 0,0.3, 1,0.3]],
  '5': [[1,1, 0,1, 0,0.55, 0.72,0.55, 1,0.34, 1,0.19, 0.74,0, 0.24,0, 0,0.18]],
  '6': [[0.92,0.86, 0.7,1, 0.29,1, 0,0.72, 0,0.24, 0.25,0, 0.73,0, 1,0.24, 1,0.41, 0.74,0.59, 0.25,0.59, 0,0.4]],
  '7': [[0,1, 1,1, 0.25,0]],
  '8': [[0.27,0.5, 0,0.7, 0,0.82, 0.25,1, 0.75,1, 1,0.82, 1,0.7, 0.73,0.5, 0.27,0.5,
         0,0.3, 0,0.18, 0.25,0, 0.75,0, 1,0.18, 1,0.3, 0.73,0.5]],
  '9': [[1,0.6, 0.75,0.41, 0.26,0.41, 0,0.6, 0,0.79, 0.26,1, 0.75,1, 1,0.76, 1,0.26, 0.71,0, 0.25,0, 0.05,0.14]],
  '-': [[0.08,0.46, 0.92,0.46]],
  '/': [[0,0, 1,1]],
  '.': [[0.44,0.02, 0.55,0.02]],
  ',': [[0.53,0.08, 0.4,-0.13]],
  ':': [[0.45,0.24, 0.55,0.24], [0.45,0.76, 0.55,0.76]],
  '+': [[0,0.5, 1,0.5], [0.5,0, 0.5,1]],
  '(': [[0.75,1, 0.3,0.77, 0.2,0.5, 0.3,0.23, 0.75,0]],
  ')': [[0.25,1, 0.7,0.77, 0.8,0.5, 0.7,0.23, 0.25,0]],
  a: [[0.1,0.58, 0.32,0.73, 0.75,0.73, 0.94,0.55, 0.94,0],
      [0.94,0.46, 0.27,0.46, 0.03,0.29, 0.03,0.14, 0.24,0, 0.66,0, 0.94,0.17]],
  e: [[0,0.36, 1,0.36, 1,0.53, 0.75,0.73, 0.27,0.73, 0,0.5, 0,0.2, 0.26,0, 0.75,0, 0.97,0.13]],
  i: [[0.5,0, 0.5,0.7], [0.5,0.94, 0.5,1]],
  l: [[0.4,1, 0.4,0.13, 0.7,0]],
  n: [[0,0, 0,0.73], [0,0.48, 0.3,0.73, 0.7,0.73, 1,0.48, 1,0]],
  o: [[0.25,0, 0,0.2, 0,0.52, 0.25,0.73, 0.75,0.73, 1,0.52, 1,0.2, 0.75,0, 0.25,0]],
  r: [[0,0, 0,0.73], [0,0.45, 0.35,0.73, 0.85,0.73]],
  u: [[0,0.73, 0,0.22, 0.25,0, 0.67,0, 1,0.24], [1,0.73, 1,0]],
  g: [[0.96,0.53, 0.72,0.73, 0.25,0.73, 0,0.5, 0,0.24, 0.24,0.04, 0.7,0.04, 0.96,0.28],
      [0.96,0.73, 0.96,-0.08, 0.72,-0.27, 0.25,-0.27]],
  h: [[0,0, 0,1], [0,0.47, 0.3,0.73, 0.7,0.73, 1,0.48, 1,0]],
  b: [[0,1, 0,0], [0,0.49, 0.3,0.73, 0.73,0.73, 1,0.5, 1,0.23, 0.74,0, 0.3,0, 0,0.21]],
  c: [[1,0.58, 0.75,0.73, 0.27,0.73, 0,0.51, 0,0.21, 0.26,0, 0.76,0, 1,0.14]],
  d: [[1,1, 1,0], [1,0.49, 0.7,0.73, 0.27,0.73, 0,0.5, 0,0.23, 0.26,0, 0.7,0, 1,0.21]],
  m: [[0,0, 0,0.73], [0,0.5, 0.22,0.73, 0.47,0.55, 0.47,0],
      [0.47,0.55, 0.74,0.73, 1,0.5, 1,0]],
  s: [[0.95,0.58, 0.73,0.73, 0.25,0.73, 0,0.56, 0.2,0.4, 0.78,0.32, 1,0.15, 0.77,0, 0.26,0, 0.02,0.15]]
};

function stroke(builder, points, width, zone = 'ink', z = 0) {
  if (points.length < 2) return;
  const closed = points.length > 2
    && Math.hypot(points[0][0] - points.at(-1)[0], points[0][1] - points.at(-1)[1]) < 1e-10;
  const path = closed ? points.slice(0, -1) : points;
  const sides = [];
  for (let i = 0; i < path.length; i++) {
    const current = new THREE.Vector2(...path[i]);
    const previous = new THREE.Vector2(...path[i === 0 ? (closed ? path.length - 1 : 0) : i - 1]);
    const next = new THREE.Vector2(...path[i === path.length - 1 ? (closed ? 0 : i) : i + 1]);
    let before = current.clone().sub(previous);
    let after = next.clone().sub(current);
    if (before.lengthSq() < 1e-16) before.copy(after);
    if (after.lengthSq() < 1e-16) after.copy(before);
    before.normalize();
    after.normalize();
    const n1 = new THREE.Vector2(-before.y, before.x);
    const n2 = new THREE.Vector2(-after.y, after.x);
    const miter = n1.clone().add(n2);
    if (miter.lengthSq() < 1e-12) miter.copy(n2);
    miter.normalize();
    const length = Math.min(width, width * 0.5 / Math.max(0.35, Math.abs(miter.dot(n2))));
    sides.push([
      [current.x + miter.x * length, current.y + miter.y * length, z],
      [current.x - miter.x * length, current.y - miter.y * length, z]
    ]);
  }
  const count = closed ? path.length : path.length - 1;
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % path.length;
    builder.quad(sides[i][0], sides[i][1], sides[j][1], sides[j][0], zone);
  }
}

function glyphMetrics(character, chemical) {
  const subscript = chemical && /[0-9]/.test(character);
  const narrow = 'Iil.:,()1'.includes(character);
  const wide = 'MWm'.includes(character);
  const width = character === ' ' ? 0.36 : narrow ? 0.34 : wide ? 0.85 : 0.64;
  const factor = subscript ? 0.65 : 1;
  return { width: width * factor, advance: (width + 0.22) * factor, factor, subscript };
}

function textGeometry(text, desiredHeight, maxWidth, colors, options = {}) {
  const chemical = options.chemical === true;
  const units = [...text].reduce((sum, ch) => sum + glyphMetrics(ch, chemical).advance, 0);
  const height = Math.min(desiredHeight, maxWidth / Math.max(units, 0.001));
  const actualWidth = units * height;
  let cursor = options.align === 'right' ? -actualWidth : options.align === 'center' ? -actualWidth / 2 : 0;
  const builder = new Facets(colors);
  for (const character of text) {
    const metrics = glyphMetrics(character, chemical);
    if (character !== ' ') {
      const direct = FONT[character];
      const paths = direct || FONT[character.toUpperCase()] || FONT['-'];
      const lowerFallback = !direct && character !== character.toUpperCase();
      const glyphHeight = height * metrics.factor * (lowerFallback ? 0.73 : 1);
      const baseline = metrics.subscript ? -height * 0.17 : 0;
      for (const coordinates of paths) {
        const points = [];
        for (let i = 0; i < coordinates.length; i += 2) {
          points.push([
            cursor + coordinates[i] * metrics.width * height,
            baseline + coordinates[i + 1] * glyphHeight
          ]);
        }
        stroke(builder, points, height * (options.weight || 0.063) * metrics.factor, options.zone || 'ink');
      }
    }
    cursor += metrics.advance * height;
  }
  return builder.geometry();
}

function roundedRectangle(width, height, radius) {
  const x = -width / 2, y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  shape.closePath();
  return shape;
}

function buildPlacard(size, colors, info) {
  const parts = [];
  const width = size * 0.79;
  const height = size * 0.2;
  const thickness = size * 0.0034;
  const angle = 65 * Math.PI / 180;
  const front = thickness + size * 0.0007;
  addExtrusion(parts, roundedRectangle(width + size * 0.009, height + size * 0.006, size * 0.013),
    thickness, colors.trim, 0, height / 2, -thickness * 0.7, size * 0.0009, 'placard_frame');
  addExtrusion(parts, roundedRectangle(width, height, size * 0.01),
    thickness, colors.placard, 0, height / 2, 0, size * 0.00045, 'placard_face');

  const left = -width / 2 + size * 0.031;
  const addText = (text, h, maxW, x, y, name, options = {}) => {
    const geometry = textGeometry(text, h, maxW, colors, options);
    geometry.translate(x, y, front);
    parts.push(record(geometry, name, null, null, { role: 'vector-lettering', text }));
  };
  addText('MINERAL ATLAS', size * 0.012, width * 0.54, left, height * 0.875,
    'placard_collection', { zone: 'ink', weight: 0.06 });
  addText(`${pad(info.index)} / ${pad(Object.keys(catalog).length)}`, size * 0.011,
    width * 0.32, width / 2 - size * 0.029, height * 0.875,
    'placard_accession', { align: 'right', zone: 'ink' });
  addText(info.label.toUpperCase(), size * 0.043, width * 0.79,
    left, height * 0.55, 'placard_title', { weight: 0.067 });
  addText(info.shortFormula || info.formula, size * 0.021, width * 0.79,
    left, height * 0.335, 'placard_formula', { chemical: !info.shortFormula, weight: 0.062 });
  addText(`${info.system.toUpperCase()} / MOHS ${info.hardness}`, size * 0.012,
    width * 0.86, left, height * 0.112, 'placard_properties', { weight: 0.06 });

  const decorations = new Facets(colors);
  stroke(decorations, [[left, height * 0.255], [width / 2 - size * 0.03, height * 0.255]],
    size * 0.0009, 'trim', front);
  const iconX = width / 2 - size * 0.052;
  const iconY = height * 0.47;
  const r = size * 0.022;
  stroke(decorations, [
    [iconX, iconY + r * 1.8], [iconX + r, iconY + r * 0.65],
    [iconX + r, iconY - r * 0.7], [iconX, iconY - r],
    [iconX - r, iconY - r * 0.7], [iconX - r, iconY + r * 0.65],
    [iconX, iconY + r * 1.8]
  ], size * 0.0011, 'trim', front);
  stroke(decorations, [
    [iconX, iconY + r * 1.8], [iconX, iconY + r * 0.45], [iconX, iconY - r]
  ], size * 0.0008, 'trim', front);
  stroke(decorations, [
    [iconX - r, iconY + r * 0.65], [iconX, iconY + r * 0.45], [iconX + r, iconY + r * 0.65]
  ], size * 0.0008, 'trim', front);
  parts.push(record(decorations.geometry(), 'placard_rules_and_emblem'));

  for (const sign of [-1, 1]) {
    addCylinder(parts, size * 0.0036, size * 0.0036, size * 0.001, 10,
      sign * (width / 2 - size * 0.012), size * 0.012, front,
      Math.PI / 2, 0, 0, colors.trim, `placard_screw_${sign < 0 ? 'left' : 'right'}`);
    parts.push(record(box(size * 0.0046, size * 0.0007, size * 0.0003,
      sign * (width / 2 - size * 0.012), size * 0.012, front + size * 0.00065),
    `placard_screw_slot_${sign < 0 ? 'left' : 'right'}`, colors.ink));
  }
  addWire(parts, [-width * 0.46, 0, -thickness], [width * 0.46, 0, -thickness],
    colors.trim, size * 0.003, 8, 'placard_hinge_pin');

  for (const sign of [-1, 1]) {
    const support = new Facets(colors);
    const x = sign * width * 0.34;
    const half = size * 0.011;
    const dz = height * Math.sin(angle) * 0.76;
    const dy = height * Math.cos(angle) * 0.76 - thickness * 1.4;
    const points = [
      [x - half, 0, -size * 0.012], [x - half, 0, -dz], [x - half, dy, -dz],
      [x + half, 0, -size * 0.012], [x + half, 0, -dz], [x + half, dy, -dz]
    ];
    support.tri(points[0], points[2], points[1], 'mount');
    support.tri(points[3], points[4], points[5], 'mount');
    support.quad(points[0], points[1], points[4], points[3], 'mount');
    support.quad(points[1], points[2], points[5], points[4], 'mount');
    support.quad(points[2], points[0], points[3], points[5], 'mount');
    const geometry = support.geometry();
    geometry.rotateX(angle);
    parts.push(record(geometry, `placard_support_${sign < 0 ? 'left' : 'right'}`));
  }
  return { parts, angle };
}

const HABIT_KINDS = {
  prismatic: 'quartz', cubic: 'cubic', hopper: 'hopper',
  octahedral: 'octahedral', rhombohedral: 'rhombohedral',
  dodecahedral: 'dodecahedral', pyritohedral: 'pyritohedral',
  tabular: 'tabular', bladed: 'bladed', acicular: 'acicular',
  bipyramidal: 'bipyramidal', barrel: 'corundum',
  botryoidal: 'botryoidal', massive: 'massive'
};

const HABIT_ASPECTS = {
  quartz: 0.2, cubic: 0.5, hopper: 0.5, octahedral: 0.5,
  rhombohedral: 0.81, dodecahedral: 0.5, pyritohedral: 0.5,
  tabular: 1.4, bladed: 0.24, acicular: 0.055,
  bipyramidal: 0.36, corundum: 0.38, botryoidal: 0.86, massive: 0.66
};

function orientedBounds(geometry, quaternion) {
  const positions = geometry.getAttribute('position');
  const point = new THREE.Vector3();
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).applyQuaternion(quaternion);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return { minY, maxY };
}

function orientation(axis, yaw) {
  return new THREE.Quaternion().setFromUnitVectors(UP, axis.clone().normalize())
    .multiply(new THREE.Quaternion().setFromAxisAngle(UP, yaw));
}

function crystalCount(formation, kind, density) {
  if (formation === 'single') return 1;
  let count = formation === 'cluster' ? 14 + density * 7
    : formation === 'radiating' ? 8 + density * 5 : 3 + density * 3;
  if (['cubic', 'hopper', 'dodecahedral', 'pyritohedral', 'rhombohedral', 'octahedral'].includes(kind)) count *= 0.58;
  if (kind === 'massive') count *= 0.25;
  if (kind === 'mica' || kind === 'tabular') count *= 0.62;
  if (kind === 'botryoidal') count = Math.min(16, Math.round(count * 0.25));
  return Math.max(2, Math.round(count));
}

function buildCrystals(p, info, kind, aspect, formation, matrix, baseY, colors) {
  const parts = [];
  const rng = randomFor(p.growthSeed ^ 0x632BE59B);
  const size = p.specimenSize;
  const count = crystalCount(formation, kind, p.clusterDensity);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const topTarget = size * 0.84;
  const lamellar = ['mica', 'tabular', 'hematite'].includes(kind) || info.id === 'desert-rose';
  let serial = 0;

  const emit = (x, z, axis, height, radius, rootY, small, role) => {
    const q = orientation(axis, rng() * TAU);
    const geometry = crystalGeometry(kind, height, radius, colors, rng, info, small);
    const extents = orientedBounds(geometry, q);
    const y = Math.max(rootY, baseY - extents.minY + size * 0.00008);
    const position = new THREE.Vector3(x, y, z);
    const name = `crystal_${pad(++serial)}`;
    parts.push(record(geometry, name, null,
      new THREE.Matrix4().compose(position, q, UNIT_SCALE), {
        role,
        mineral: info.id,
        habit: kind,
        pivot: position.toArray(),
        nominalLength: height,
        nominalRadius: radius
      }));
  };

  for (let i = 0; i < count; i++) {
    const hero = i === 0;
    const t = count <= 1 ? 0 : i / (count - 1);
    const rho = Math.sqrt(t);
    const angle = i * golden + (rng() - 0.5) * 0.28;
    let x = hero ? -size * 0.03 : Math.cos(angle) * matrix.rx * 0.78 * rho;
    let z = hero ? matrix.centerZ - size * 0.025
      : matrix.centerZ + Math.sin(angle) * matrix.rz * 0.77 * rho;
    let axis = new THREE.Vector3(0, 1, 0);
    let growth = hero ? 1 : Math.min(0.81, 0.43 + 0.33 * (1 - rho) + rng() * 0.14);
    if (!hero && i < 3) growth = i === 1 ? 0.84 : 0.74;
    if (formation === 'radiating') {
      const tilt = hero ? 0 : 0.2 + 1.06 * rho;
      axis.set(Math.cos(angle) * Math.sin(tilt), Math.cos(tilt), Math.sin(angle) * Math.sin(tilt) * 0.78).normalize();
      const spread = lamellar ? 0.11 : 0.035;
      x = Math.cos(angle) * size * spread * rho;
      z = matrix.centerZ + Math.sin(angle) * size * spread * rho * 0.7;
      growth = hero ? 0.9 : 0.55 + rng() * 0.28;
      if (axis.z > 0) growth *= 0.86;
    } else if (!hero) {
      const tilt = 0.07 + rho * 0.35 + rng() * 0.07;
      axis.set(Math.cos(angle) * Math.sin(tilt), Math.cos(tilt), Math.sin(angle) * Math.sin(tilt) * 0.8).normalize();
    }
    if (formation === 'single') {
      x = 0;
      z = matrix.centerZ;
    }
    const surface = matrix.surfaceAt(x, z);
    const rootY = matrix.height > 0 ? baseY + (surface - baseY) * 0.8 : baseY;
    const radiusBudget = size * (formation === 'single' ? 0.31 : hero ? 0.185 : 0.132)
      * (hero ? 1 : 0.76 + rng() * 0.24);
    let height = Math.min((topTarget - rootY) * growth, radiusBudget / aspect);
    if (kind === 'botryoidal') height *= 0.86;
    if (lamellar && formation === 'radiating') {
      height = Math.min(height, size * (0.055 + rng() * 0.033));
    }
    const radius = height * aspect;
    emit(x, z, axis, height, radius, rootY, false, hero ? 'principal-crystal' : 'intergrown-crystal');
  }

  if (formation !== 'single' && matrix.height > 0) {
    let druse = Math.round((4 + p.clusterDensity * 1.1) * p.matrixAmount);
    if (['botryoidal', 'massive'].includes(kind)) druse = Math.min(druse, 4);
    for (let i = 0; i < druse; i++) {
      const angle = i * golden + 0.7;
      const distance = 0.78 + rng() * 0.16;
      const edge = matrix.boundary(angle);
      const x = Math.cos(angle) * matrix.rx * distance * edge;
      const z = matrix.centerZ + Math.sin(angle) * matrix.rz * distance * edge;
      const rootY = baseY + (matrix.surfaceAt(x, z) - baseY) * 0.88;
      const height = Math.min(size * (0.033 + rng() * 0.039), size * 0.035 / aspect);
      const axis = new THREE.Vector3(Math.cos(angle) * 0.19, 1, Math.sin(angle) * 0.19).normalize();
      emit(x, z, axis, height, height * aspect, rootY, true, 'peripheral-druse');
    }
  }
  return parts;
}

function buildShards(p, info, kind, colors, baseY, formation) {
  const parts = [];
  if (!p.showShards || formation === 'single') return parts;
  const size = p.specimenSize;
  const rng = randomFor(p.growthSeed ^ 0x9E3779B9);
  const count = 3 + Math.floor(p.clusterDensity * 0.5);
  const palette = { ...colors, crystal: colors.shard };
  for (let i = 0; i < count; i++) {
    const sign = i % 2 ? 1 : -1;
    const height = size * (0.035 + rng() * 0.031);
    const sheet = ['mica', 'hematite', 'tabular', 'bladed', 'azurite'].includes(kind);
    const r = height * (sheet ? 0.65 : ['cubic', 'hopper', 'rhombohedral'].includes(kind) ? 0.5 : 0.25);
    const geometry = shardGeometry(kind, sheet ? height * 0.65 : height, r, palette, rng, info);
    const q = orientation(new THREE.Vector3(sign * (0.6 + rng()), 0.2 + rng() * 0.2, rng() - 0.5), rng() * TAU);
    const bounds = orientedBounds(geometry, q);
    const x = sign * size * (0.48 + rng() * 0.055);
    const z = size * (0.11 + Math.floor(i / 2) * 0.062 + rng() * 0.021);
    const position = new THREE.Vector3(x, baseY - bounds.minY + size * 0.00012, z);
    parts.push(record(geometry, `shard_${pad(i + 1)}`, null,
      new THREE.Matrix4().compose(position, q, UNIT_SCALE), {
        role: 'loose-fragment', mineral: info.id, pivot: position.toArray()
      }));
  }
  return parts;
}

function restoreMatrix(object, matrix) {
  matrix.decompose(object.position, object.quaternion, object.scale);
  object.updateMatrix();
  object.updateMatrixWorld(true);
}

/* One material is owned by each semantic assembly. Individual production parts
 * remain addressable through ranges and are materialized only when detached.
 */
function installPartAPI(root, definitions, merge, ownedMaterials) {
  const batches = [];
  const records = new Map();
  const assemblies = new Map();
  const removedAssemblies = new Map();
  let disposed = false;

  const releaseMeshes = batch => {
    for (const mesh of batch.meshes) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
    batch.meshes = [];
  };

  const rebuild = batch => {
    releaseMeshes(batch);
    for (const item of batch.list) item.mesh = null;
    const active = batch.list.filter(item => !item.detached && (!merge || item.enabled));
    const result = finish(active, batch.material, `${batch.group.name}_batch`, merge);
    if (!result) return;
    const meshes = result.isGroup ? [...result.children] : [result];
    for (const mesh of meshes) {
      batch.group.add(mesh);
      batch.meshes.push(mesh);
      if (!merge) {
        const item = records.get(mesh.name);
        mesh.visible = item.enabled;
        item.mesh = mesh;
      }
    }
  };

  for (const definition of definitions) {
    const batch = { ...definition, meshes: [] };
    batches.push(batch);
    assemblies.set(batch.group.name, batch.group);
    for (const item of batch.list) {
      item.enabled = true;
      item.detached = null;
      item.batch = batch;
      item.mesh = null;
      records.set(item.name, item);
    }
  }
  assemblies.set('specimen', root.getObjectByName('specimen'));
  batches.forEach(rebuild);

  const updateStats = () => {
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const dimensions = bounds.getSize(new THREE.Vector3());
    let triangles = 0, meshes = 0;
    const materials = new Set();
    root.traverse(object => {
      if (!object.isMesh) return;
      triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
      meshes++;
      materials.add(object.material);
    });
    root.userData.specs = {
      units: 'meters',
      dimensions: { width: dimensions.x, height: dimensions.y, depth: dimensions.z },
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      triangles,
      meshCount: meshes,
      materialCount: materials.size,
      productionBatches: merge ? meshes : null,
      crystalCount: [...records.keys()].filter(name => name.startsWith('crystal_')).length,
      editable: !merge,
      note: 'Draw-call counts refer to geometry batches; shadows and physical transmission can add renderer passes.'
    };
    return root.userData.specs;
  };

  const ensureLive = () => {
    if (disposed) throw new Error('This mineral specimen has been disposed.');
  };

  const api = {
    list() {
      return [...records.values()].map(item => ({
        name: item.name,
        assembly: item.batch.group.name,
        visible: item.enabled,
        detached: !!item.detached,
        semantic: item.meta || {}
      }));
    },
    get(name) {
      const item = records.get(name);
      if (item) {
        return item.detached || item.mesh || {
          name,
          merged: true,
          assembly: item.batch.group,
          semantic: item.meta || {}
        };
      }
      return assemblies.get(name) || null;
    },
    setVisible(name, visible) {
      ensureLive();
      const item = records.get(name);
      if (item) {
        item.enabled = Boolean(visible);
        if (item.detached) item.detached.visible = item.enabled;
        else if (merge) rebuild(item.batch);
        else if (item.mesh) item.mesh.visible = item.enabled;
      } else {
        const assembly = assemblies.get(name);
        if (!assembly) return false;
        assembly.visible = Boolean(visible);
      }
      updateStats();
      return true;
    },
    detach(name) {
      ensureLive();
      const item = records.get(name);
      if (item) {
        if (item.detached) return item.detached;
        const mesh = merge ? singleMesh(item, item.batch.material, item.name) : item.mesh;
        if (!mesh) return null;
        item.batch.group.updateWorldMatrix(true, false);
        let world;
        if (merge) {
          world = item.batch.group.matrixWorld.clone()
            .multiply(item.transform || new THREE.Matrix4());
          item.restLocal = (item.transform || new THREE.Matrix4()).clone();
        } else {
          mesh.updateWorldMatrix(true, false);
          world = mesh.matrixWorld.clone();
          item.restLocal = mesh.matrix.clone();
          item.batch.meshes = item.batch.meshes.filter(entry => entry !== mesh);
        }
        mesh.removeFromParent();
        restoreMatrix(mesh, world);
        mesh.visible = item.enabled;
        item.detached = mesh;
        item.mesh = null;
        if (merge) rebuild(item.batch);
        updateStats();
        return mesh;
      }
      const assembly = assemblies.get(name);
      if (!assembly) return null;
      if (removedAssemblies.has(name)) return assembly;
      assembly.updateWorldMatrix(true, false);
      const parent = assembly.parent;
      if (!parent) return assembly;
      const local = assembly.matrix.clone();
      const world = assembly.matrixWorld.clone();
      removedAssemblies.set(name, { parent, local });
      assembly.removeFromParent();
      restoreMatrix(assembly, world);
      updateStats();
      return assembly;
    },
    reattach(name) {
      ensureLive();
      const item = records.get(name);
      if (item?.detached) {
        const mesh = item.detached;
        mesh.removeFromParent();
        item.g.dispose();
        item.g = mesh.geometry.clone();
        item.g.userData.smooth = mesh.geometry.userData.smooth === true
          || item.batch.material.flatShading === false;
        item.transform = item.restLocal.clone();
        item.detached = null;
        if (merge) {
          mesh.geometry.dispose();
          rebuild(item.batch);
        } else {
          restoreMatrix(mesh, item.restLocal);
          item.batch.group.add(mesh);
          item.batch.meshes.push(mesh);
          item.mesh = mesh;
          mesh.visible = item.enabled;
        }
        updateStats();
        return merge ? item.batch.group : item.mesh;
      }
      const saved = removedAssemblies.get(name);
      if (!saved) return null;
      const assembly = assemblies.get(name);
      assembly.removeFromParent();
      saved.parent.add(assembly);
      restoreMatrix(assembly, saved.local);
      removedAssemblies.delete(name);
      updateStats();
      return assembly;
    },
    resolveIntersection(intersection) {
      const object = intersection?.object;
      if (!object) return null;
      if (object.userData.partId) return object.userData.partId;
      const ranges = object.userData.partRanges;
      if (!ranges || !Number.isInteger(intersection.faceIndex)) return object.name || null;
      const vertex = intersection.faceIndex * 3;
      return ranges.find(range => vertex >= range.start && vertex < range.start + range.count)?.name || null;
    },
    refreshStats: updateStats
  };

  root.userData.parts = api;
  root.userData.detach = [
    'specimen', ...definitions.map(definition => definition.group.name), ...records.keys()
  ];
  root.userData.dispose = () => {
    if (disposed) return;
    disposed = true;
    const geometries = new Set();
    for (const batch of batches) {
      for (const mesh of batch.meshes) {
        geometries.add(mesh.geometry);
        mesh.removeFromParent();
      }
      for (const item of batch.list) {
        geometries.add(item.g);
        if (item.detached) {
          geometries.add(item.detached.geometry);
          item.detached.removeFromParent();
        }
      }
      batch.group.clear();
    }
    geometries.forEach(geometry => geometry.dispose());
    ownedMaterials.forEach(material => material.dispose());
    for (const assembly of assemblies.values()) assembly?.removeFromParent();
    root.clear();
    root.removeFromParent();
    records.clear();
    removedAssemblies.clear();
  };
  updateStats();
}

export function createAsset(userParams = {}) {
  const p = readParams(userParams);
  const info = catalog[p.mineralType];
  const formation = p.formation === 'natural' ? info.formation : p.formation;
  let kind = p.crystalHabit === 'natural' ? info.kind : HABIT_KINDS[p.crystalHabit];
  if (p.crystalHabit === 'prismatic' && ['beryl', 'apatite', 'tourmaline'].includes(info.kind)) {
    kind = info.kind;
  }
  const naturalShape = p.crystalHabit === 'natural' || kind === info.kind;
  const aspect = naturalShape ? info.aspect : (HABIT_ASPECTS[kind] || 0.2);
  const amount = formation === 'single' ? 0 : p.matrixAmount;
  const size = p.specimenSize;

  const palette = { ...info.palette };
  if (p.colorway === 'default') {
    [palette.matrix, palette.matrixLight, palette.matrixDark, palette.vein] = info.host;
  }
  if (p.useCustomColors) {
    for (const key of ZONE_KEYS) palette[key] = p[key];
  }
  const colors = zonesFor(p.colorway, palette);

  const root = new THREE.Group();
  root.name = `mineral-atlas-${info.id}`;
  root.userData.asset = 'Mineral Atlas';
  root.userData.license = 'MIT';
  root.userData.units = 'meters';
  root.userData.catalogId = info.id;
  root.userData.mineral = {
    id: info.id,
    name: info.label,
    formula: info.formula,
    system: info.system,
    hardness: info.hardness,
    description: info.describe,
    catalogNumber: info.index
  };
  root.userData.zones = { ...colors };
  root.userData.rig = rig;
  root.userData.night = night;
  root.userData.resolvedParams = {
    ...p,
    effectiveHabit: kind,
    effectiveFormation: formation,
    effectiveMatrixAmount: amount
  };

  const specimen = new THREE.Group();
  specimen.name = 'specimen';
  specimen.rotation.y = p.azimuth * Math.PI / 180;
  root.add(specimen);

  const crystals = new THREE.Group();
  crystals.name = 'crystals';
  const matrixGroup = new THREE.Group();
  matrixGroup.name = 'matrix';
  const shards = new THREE.Group();
  shards.name = 'shards';
  specimen.add(matrixGroup, crystals, shards);

  const mount = new THREE.Group();
  mount.name = 'mount';
  const placard = new THREE.Group();
  placard.name = 'placard';
  root.add(mount, placard);

  const crystalMaterial = GLASS_MAT.clone();
  crystalMaterial.name = `${info.id}_crystal_material`;
  crystalMaterial.flatShading = kind !== 'botryoidal';
  crystalMaterial.metalness = info.metalness;
  crystalMaterial.roughness = clamp(
    info.roughness + (1 - p.clarity) * (info.metalness > 0.5 ? 0.1 : 0.24), 0.075, 0.95
  );
  crystalMaterial.transmission = info.transparency * p.clarity * 0.68;
  crystalMaterial.thickness = size * (0.025 + 0.08 * p.clarity);
  crystalMaterial.ior = info.ior;
  crystalMaterial.clearcoat = info.metalness > 0.5 ? 0.17 : 0.3 + p.clarity * 0.46;
  crystalMaterial.clearcoatRoughness = 0.08 + (1 - p.clarity) * 0.19;
  crystalMaterial.iridescence = info.iridescence;
  crystalMaterial.iridescenceIOR = 1.3;
  crystalMaterial.iridescenceThicknessRange = [140, 320];
  crystalMaterial.attenuationDistance = size * (0.6 + p.clarity * 1.8);
  crystalMaterial.attenuationColor.set(colors.crystal).lerp(new THREE.Color(0xffffff), 0.72);
  crystalMaterial.specularIntensity = 1;
  crystalMaterial.emissive.set(info.fluorescence || 0x000000);
  crystalMaterial.emissiveIntensity = p.uvFluorescence ? info.fluorescenceStrength : 0;

  const shardMaterial = crystalMaterial.clone();
  shardMaterial.name = `${info.id}_shard_material`;
  shardMaterial.roughness = clamp(crystalMaterial.roughness + 0.1, 0, 1);
  shardMaterial.transmission *= 0.72;
  shardMaterial.thickness *= 0.3;

  const matrixMaterial = MAT.clone();
  matrixMaterial.name = `${info.id}_matrix_material`;
  matrixMaterial.roughness = 0.93;

  const mountMaterial = MAT.clone();
  mountMaterial.name = 'mineral_atlas_mount_material';
  mountMaterial.roughness = 0.66;
  mountMaterial.metalness = 0.08;

  const placardMaterial = MAT.clone();
  placardMaterial.name = 'mineral_atlas_placard_material';
  placardMaterial.roughness = 0.69;
  placardMaterial.metalness = 0.03;

  const ownedMaterials = new Set([
    crystalMaterial, shardMaterial, matrixMaterial, mountMaterial, placardMaterial
  ]);

  const mountBuild = p.displayBase ? buildMount(size, colors) : { parts: [], top: 0 };
  const baseY = mountBuild.top;
  const matrixBuild = makeMatrix(size, amount, baseY, colors, p.growthSeed);
  const crystalParts = buildCrystals(p, info, kind, aspect, formation, matrixBuild, baseY, colors);
  const shardParts = buildShards(p, info, kind, colors, baseY, formation);

  let placardParts = [];
  if (p.showPlacard) {
    const plaque = buildPlacard(size, colors, info);
    placardParts = plaque.parts;
    placard.position.set(0, baseY + size * 0.005, size * 0.44);
    placard.rotation.x = -plaque.angle;
  }

  const definitions = [
    { group: mount, list: mountBuild.parts, material: mountMaterial },
    { group: matrixGroup, list: matrixBuild.parts, material: matrixMaterial },
    { group: crystals, list: crystalParts, material: crystalMaterial },
    { group: shards, list: shardParts, material: shardMaterial },
    { group: placard, list: placardParts, material: placardMaterial }
  ];

  installPartAPI(root, definitions, p.mergeForProduction, ownedMaterials);

  root.userData.setUV = (enabled, strength = 1) => {
    const multiplier = Number.isFinite(Number(strength)) ? clamp(Number(strength), 0, 2) : 1;
    const intensity = enabled && info.fluorescence ? info.fluorescenceStrength * multiplier : 0;
    crystalMaterial.emissiveIntensity = intensity;
    shardMaterial.emissiveIntensity = intensity;
    root.userData.uvEnabled = intensity > 0;
    return intensity;
  };
  root.userData.uvEnabled = p.uvFluorescence && !!info.fluorescence;
  root.userData.fluorescence = {
    color: info.fluorescence,
    strength: info.fluorescenceStrength,
    note: 'Illustrative response. Actual fluorescence depends on locality, trace chemistry, and UV wavelength.'
  };
  root.userData.materials = {
    crystals: crystalMaterial.name,
    matrix: matrixMaterial.name,
    shards: shardMaterial.name,
    mount: mountMaterial.name,
    placard: placardMaterial.name
  };

  return root;
}

export default createAsset;
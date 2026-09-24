// Ghana reference data shared by the forms. Mirrors utils/ghana.js on the backend.

export const ACCRA = { lat: 5.6037, lng: -0.1870 };

export const REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Western North', 'Central', 'Eastern',
  'Volta', 'Oti', 'Northern', 'Savannah', 'North East', 'Upper East', 'Upper West',
  'Bono', 'Bono East', 'Ahafo'
];

export const WASTE_TYPES = [
  { value: 'Household mix', hint: 'Everyday kitchen & home rubbish', unit: 'bag' },
  { value: 'Recyclables', hint: 'Sachet water bags, PET bottles, cans, cartons', unit: 'bag' },
  { value: 'Organic / food waste', hint: 'Food scraps, peels, market waste', unit: 'bag' },
  { value: 'Garden waste', hint: 'Grass, leaves, branches', unit: 'bundle' },
  { value: 'Bulky items', hint: 'Old furniture, mattresses', unit: 'item' },
  { value: 'E-waste', hint: 'Phones, TVs, fridges, batteries', unit: 'item' },
  { value: 'Construction debris', hint: 'Blocks, rubble, tiles', unit: 'bag' },
  { value: 'Large waste bin', hint: '120–240 L wheelie bins', unit: 'bin' }
];

export const TIME_WINDOWS = ['06:00 – 08:00', '08:00 – 10:00', '10:00 – 12:00', '12:00 – 14:00', '14:00 – 16:00', '16:00 – 18:00'];

export const VEHICLE_TYPES = ['Motor tricycle (Aboboyaa)', 'Mini truck', 'Light truck', 'Tipper truck', 'Compactor truck'];

// Typical diesel use, L/100km - a starting point collectors can adjust.
export const VEHICLE_ECONOMY = {
  'Motor tricycle (Aboboyaa)': 4.5, 'Mini truck': 8.5, 'Light truck': 10, 'Tipper truck': 22, 'Compactor truck': 35
};

const NETWORK_PREFIXES = {
  MTN: ['024', '025', '053', '054', '055', '059'],
  Telecel: ['020', '050'],
  AirtelTigo: ['026', '027', '056', '057']
};

const toLocal = (input) => {
  let digits = String(input || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+233')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('233') && digits.length === 12) digits = `0${digits.slice(3)}`;
  return digits;
};

export const detectNetwork = (phone) => {
  const prefix = toLocal(phone).slice(0, 3);
  return Object.keys(NETWORK_PREFIXES).find((n) => NETWORK_PREFIXES[n].includes(prefix)) || null;
};

export const isValidGhanaPhone = (phone) => /^0\d{9}$/.test(toLocal(phone)) && Boolean(detectNetwork(phone));

// "+233241234567" -> "024 123 4567"
export const formatPhone = (phone) => {
  const local = toLocal(phone);
  return /^0\d{9}$/.test(local) ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : (phone || '');
};

export const telLink = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;

export const GHANA_POST_GPS_REGEX = /^[A-Z]{2}-\d{3,4}-\d{4}$/;
export const normalizeGps = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '-');

export const VEHICLE_REG_REGEX = /^[A-Z]{2}[\s-]?\d{1,4}[\s-]?(\d{2}|[A-Z])$/;

const toRad = (d) => (d * Math.PI) / 180;
export const haversineKm = (a, b) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
export const ROAD_FACTOR = 1.35;

export const directionsLink = ({ lat, lng }) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

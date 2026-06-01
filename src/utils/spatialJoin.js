import { normalizeUsage, USAGE_TYPES } from './colorMap';

export function formatNumber(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toLocaleString('ko-KR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function buildSummary(parcels) {
  const totalParcels = parcels.length;
  const parcelArea = parcels.reduce((sum, feature) => sum + Number(feature.properties.area || 0), 0);
  const buildingCount = parcels.reduce((sum, feature) => sum + Number(feature.properties.buildingCount || 0), 0);
  const grossFloorArea = parcels.reduce((sum, feature) => sum + Number(feature.properties.grossFloorArea || 0), 0);

  return {
    totalParcels,
    parcelArea,
    buildingCount,
    grossFloorArea,
  };
}

export function buildUsageStats(parcels) {
  const seed = Object.fromEntries(
    USAGE_TYPES.map((type) => [type, { type, count: 0, area: 0, grossFloorArea: 0 }]),
  );

  parcels.forEach((feature) => {
    const type = normalizeUsage(feature.properties.usageGroup || feature.properties.mainUse);
    seed[type].count += 1;
    seed[type].area += Number(feature.properties.area || 0);
    seed[type].grossFloorArea += Number(feature.properties.grossFloorArea || 0);
  });

  const totalArea = Object.values(seed).reduce((sum, item) => sum + item.area, 0);

  return Object.values(seed)
    .filter((item) => item.count > 0)
    .map((item) => ({
      ...item,
      ratio: totalArea > 0 ? item.area / totalArea : 0,
    }))
    .sort((a, b) => b.area - a.area);
}

export const USAGE_TYPES = [
  '공동주택',
  '단독주택',
  '업무시설',
  '근린생활시설',
  '판매시설',
  '교육연구시설',
  '의료시설',
  '공장',
  '종교시설',
  '기타',
];

export const usageColorMap = {
  공동주택: '#3b82f6',
  단독주택: '#f59e0b',
  업무시설: '#ef4444',
  근린생활시설: '#14b8a6',
  판매시설: '#22c55e',
  교육연구시설: '#a855f7',
  의료시설: '#f43f5e',
  공장: '#64748b',
  종교시설: '#8b5cf6',
  기타: '#94a3b8',
};

export function normalizeUsage(value) {
  const text = String(value || '').trim();
  if (USAGE_TYPES.includes(text)) return text;
  if (text.includes('공동주택')) return '공동주택';
  if (text.includes('단독주택')) return '단독주택';
  if (text.includes('업무')) return '업무시설';
  if (text.includes('근린생활')) return '근린생활시설';
  if (text.includes('판매')) return '판매시설';
  if (text.includes('교육') || text.includes('연구')) return '교육연구시설';
  if (text.includes('의료')) return '의료시설';
  if (text.includes('공장')) return '공장';
  if (text.includes('종교')) return '종교시설';
  return '기타';
}

export function getUseColor(value) {
  return usageColorMap[normalizeUsage(value)] || usageColorMap.기타;
}

export function hexToRgba(hex, opacity = 1) {
  const normalized = hex.replace('#', '');
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

import fs from 'fs';
import path from 'path';
import shapefile from 'shapefile';
import proj4 from 'proj4';
import iconv from 'iconv-lite';

const rootDir = process.cwd();
const dataDir = path.resolve(rootDir, 'public', 'data');
const parcelShp = path.resolve(rootDir, 'LSMD_CONT_LDREG_서울_송파구', 'LSMD_CONT_LDREG_11710_202605.shp');
const landInfoShp = path.resolve(rootDir, 'AL_D194_11710_20260520', 'AL_D194_11710_20260520.shp');
const buildingCsv = path.resolve(rootDir, '03. 표제부_20260601150913.csv');

const epsg5186 = '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs';
const toWgs84 = proj4(epsg5186, 'EPSG:4326');

function decodeText(value) {
  if (typeof value !== 'string') return value;
  const cleaned = value.replace(/\0/g, '').trim();
  if (!cleaned) return '';
  return iconv.decode(Buffer.from(cleaned, 'binary'), 'cp949').trim();
}

function decodeProperties(properties) {
  return Object.fromEntries(
    Object.entries(properties || {}).map(([key, value]) => [key, decodeText(value)]),
  );
}

function roundCoord(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function transformCoordinates(coordinates) {
  if (typeof coordinates[0] === 'number') {
    const [lon, lat] = toWgs84.forward(coordinates);
    return [roundCoord(lon), roundCoord(lat)];
  }
  return coordinates.map(transformCoordinates);
}

async function readShapefile(filePath, mapFeature) {
  const source = await shapefile.open(filePath);
  const features = [];

  while (true) {
    const result = await source.read();
    if (result.done) break;

    const feature = result.value;
    const properties = decodeProperties(feature.properties);
    const mapped = mapFeature({
      type: 'Feature',
      geometry: {
        ...feature.geometry,
        coordinates: transformCoordinates(feature.geometry.coordinates),
      },
      properties,
    });

    if (mapped) features.push(mapped);
  }

  return features;
}

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }

  cells.push(cell);
  return cells;
}

function readCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

function padNumber(value, size) {
  const parsed = Number(String(value || '').replace(/\D/g, ''));
  return String(Number.isFinite(parsed) ? parsed : 0).padStart(size, '0');
}

function pnuFromBuilding(row) {
  const sigungu = row['시군구코드'];
  const dong = row['법정동코드'];
  if (!sigungu || !dong) return null;

  const landFlag = row['대지구분코드'] === '1' ? '2' : '1';
  return `${sigungu}${dong}${landFlag}${padNumber(row['번'], 4)}${padNumber(row['지'], 4)}`;
}

function normalizeUsage(value) {
  const text = String(value || '').trim();
  if (!text) return '기타';
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

function buildBuildingMap() {
  if (!fs.existsSync(buildingCsv)) return new Map();

  const rows = readCsv(buildingCsv);
  const grouped = new Map();

  rows.forEach((row) => {
    const pnu = pnuFromBuilding(row);
    if (!pnu || !pnu.startsWith('11710')) return;

    const current = grouped.get(pnu) || {
      count: 0,
      buildingName: '',
      mainUse: '',
      structure: '',
      approvalDate: '',
      buildingArea: 0,
      grossFloorArea: 0,
      coverageRatio: null,
      floorAreaRatio: null,
      groundFloors: null,
      basementFloors: null,
    };

    const grossFloorArea = toNumber(row['연면적(㎡)']) || 0;
    const isRepresentative = grossFloorArea >= (current.grossFloorArea || 0);

    current.count += 1;
    current.buildingArea += toNumber(row['건축면적(㎡)']) || 0;
    current.grossFloorArea += grossFloorArea;

    if (isRepresentative) {
      current.buildingName = row['건물명'] || current.buildingName;
      current.mainUse = row['주용도코드명'] || row['기타용동'] || current.mainUse;
      current.structure = row['구조코드명'] || row['기타구조'] || current.structure;
      current.approvalDate = row['사용승인일'] || current.approvalDate;
      current.coverageRatio = toNumber(row['건폐율(%)']) ?? current.coverageRatio;
      current.floorAreaRatio = toNumber(row['용적률(%)']) ?? current.floorAreaRatio;
      current.groundFloors = toNumber(row['지상층수']) ?? current.groundFloors;
      current.basementFloors = toNumber(row['지하층수']) ?? current.basementFloors;
    }

    grouped.set(pnu, current);
  });

  return grouped;
}

async function buildLandInfoMap() {
  const features = await readShapefile(landInfoShp, (feature) => {
    const props = feature.properties;
    const pnu = props.A1;
    if (!pnu || !pnu.startsWith('11710')) return null;

    return {
      pnu,
      address: props.A3,
      landCategory: props.A11,
      area: toNumber(props.A12),
      useRegion: props.A14,
      useDistrict: props.A16,
      useZone: props.A18,
      assessedValue: toNumber(props.A25),
    };
  });

  return new Map(features.map((item) => [item.pnu, item]));
}

function buildFallbackBoundaries(parcels) {
  const groups = new Map();

  parcels.forEach((feature) => {
    const pnu = feature.properties.pnu || '';
    const dongCode = pnu.slice(0, 10);
    if (!groups.has(dongCode)) {
      groups.set(dongCode, {
        minLon: Infinity,
        minLat: Infinity,
        maxLon: -Infinity,
        maxLat: -Infinity,
        count: 0,
      });
    }

    const group = groups.get(dongCode);
    const visit = (coordinates) => {
      if (typeof coordinates[0] === 'number') {
        group.minLon = Math.min(group.minLon, coordinates[0]);
        group.minLat = Math.min(group.minLat, coordinates[1]);
        group.maxLon = Math.max(group.maxLon, coordinates[0]);
        group.maxLat = Math.max(group.maxLat, coordinates[1]);
        return;
      }
      coordinates.forEach(visit);
    };

    visit(feature.geometry.coordinates);
    group.count += 1;
  });

  return {
    type: 'FeatureCollection',
    features: [...groups.entries()].map(([dongCode, box]) => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [box.minLon, box.minLat],
          [box.maxLon, box.minLat],
          [box.maxLon, box.maxLat],
          [box.minLon, box.maxLat],
          [box.minLon, box.minLat],
        ]],
      },
      properties: {
        name: dongCode,
        count: box.count,
        fallback: true,
      },
    })),
  };
}

async function main() {
  fs.mkdirSync(dataDir, { recursive: true });

  console.log('송파구 필지 전처리를 시작합니다.');
  const [landInfoMap, buildingMap] = await Promise.all([
    buildLandInfoMap(),
    Promise.resolve(buildBuildingMap()),
  ]);

  const parcels = await readShapefile(parcelShp, (feature) => {
    const pnu = feature.properties.PNU;
    if (!pnu || !pnu.startsWith('11710')) return null;

    const land = landInfoMap.get(pnu) || {};
    const building = buildingMap.get(pnu) || {};
    const mainUse = building.mainUse || '건축물 정보 없음';
    const usageGroup = normalizeUsage(mainUse);

    return {
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        pnu,
        jibun: feature.properties.JIBUN || '',
        address: land.address || '',
        landCategory: land.landCategory || '',
        area: land.area ?? null,
        assessedValue: land.assessedValue ?? null,
        useRegion: land.useRegion || '',
        useDistrict: land.useDistrict || '',
        useZone: land.useZone || '',
        buildingCount: building.count || 0,
        buildingName: building.buildingName || '',
        mainUse,
        usageGroup,
        structure: building.structure || '',
        approvalDate: building.approvalDate || '',
        buildingArea: building.buildingArea || null,
        grossFloorArea: building.grossFloorArea || null,
        coverageRatio: building.coverageRatio ?? null,
        floorAreaRatio: building.floorAreaRatio ?? null,
        groundFloors: building.groundFloors ?? null,
        basementFloors: building.basementFloors ?? null,
        statsCode: '',
        population: null,
        households: null,
        agePopulation: null,
        householdComposition: '',
      },
    };
  });

  const parcelCollection = { type: 'FeatureCollection', features: parcels };
  const boundaryCollection = buildFallbackBoundaries(parcels);

  fs.writeFileSync(path.join(dataDir, 'parcels.geojson'), JSON.stringify(parcelCollection));
  fs.writeFileSync(path.join(dataDir, 'boundaries.geojson'), JSON.stringify(boundaryCollection));

  const buildingParcelCount = parcels.filter((feature) => feature.properties.buildingCount > 0).length;
  console.log(`필지 ${parcels.length.toLocaleString('ko-KR')}개 생성`);
  console.log(`건축물 정보 연결 필지 ${buildingParcelCount.toLocaleString('ko-KR')}개`);
  console.log(`출력: ${path.relative(rootDir, dataDir)}`);
  console.log('참고: 행정동 경계 원본이 없어서 법정동 코드별 bbox 경계를 임시 생성했습니다.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

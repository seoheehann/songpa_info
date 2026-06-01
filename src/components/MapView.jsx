import { useEffect, useMemo, useRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import GeoJSON from 'ol/format/GeoJSON';
import { Fill, Stroke, Style } from 'ol/style';
import { defaults as defaultControls } from 'ol/control';
import { defaults as defaultInteractions } from 'ol/interaction';
import { fromLonLat } from 'ol/proj';
import { getUseColor, hexToRgba, normalizeUsage } from '../utils/colorMap';
import { formatNumber } from '../utils/spatialJoin';

const VWORLD_API_KEY = import.meta.env.VITE_VWORLD_API_KEY;
const geojson = new GeoJSON();

function buildBaseLayer() {
  if (VWORLD_API_KEY) {
    return new TileLayer({
      source: new XYZ({
        url: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_API_KEY}/Base/{z}/{y}/{x}.png`,
        projection: 'EPSG:3857',
        crossOrigin: 'anonymous',
        attributions: 'VWorld',
      }),
    });
  }

  return new TileLayer({
    source: new XYZ({
      url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      crossOrigin: 'anonymous',
      attributions: 'OpenStreetMap contributors',
    }),
  });
}

function popupHtml(properties) {
  return `
    <div class="parcel-popup-title">${properties.address || '주소 정보 없음'}</div>
    <div class="parcel-popup-grid">
      <span>PNU</span><strong>${properties.pnu || '-'}</strong>
      <span>지목</span><strong>${properties.landCategory || '-'}</strong>
      <span>면적</span><strong>${formatNumber(properties.area, 1)}㎡</strong>
      <span>주용도</span><strong>${properties.mainUse || '-'}</strong>
    </div>
  `;
}

function MapView({
  boundaries,
  parcels,
  filters,
  opacity,
  boundaryOn,
  parcelOn,
  selectedParcel,
  onParcelSelect,
}) {
  const mapElement = useRef(null);
  const popupElement = useRef(null);
  const mapRef = useRef(null);
  const parcelSourceRef = useRef(new VectorSource());
  const boundarySourceRef = useRef(new VectorSource());
  const parcelLayerRef = useRef(null);
  const boundaryLayerRef = useRef(null);
  const overlayRef = useRef(null);
  const propsRef = useRef({ filters, opacity, parcelOn, selectedPnu: selectedParcel?.properties?.pnu });

  propsRef.current = {
    filters,
    opacity,
    parcelOn,
    selectedPnu: selectedParcel?.properties?.pnu,
  };

  const parcelByPnu = useMemo(() => {
    return new Map(parcels.map((feature) => [feature.properties.pnu, feature]));
  }, [parcels]);

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;

    const boundaryLayer = new VectorLayer({
      source: boundarySourceRef.current,
      style: new Style({
        stroke: new Stroke({ color: 'rgba(226, 232, 240, 0.82)', width: 1.4 }),
        fill: new Fill({ color: 'rgba(15, 23, 42, 0.02)' }),
      }),
      zIndex: 2,
    });

    const parcelLayer = new VectorLayer({
      source: parcelSourceRef.current,
      renderBuffer: 80,
      updateWhileAnimating: false,
      updateWhileInteracting: false,
      style: (feature) => {
        const { filters: activeFilters, opacity: activeOpacity, parcelOn: activeParcelOn, selectedPnu } = propsRef.current;
        const zoom = mapRef.current?.getView().getZoom() || 0;
        const usage = normalizeUsage(feature.get('usageGroup') || feature.get('mainUse'));

        if (!activeParcelOn || zoom < 14 || !activeFilters[usage]) return null;

        const selected = selectedPnu && selectedPnu === feature.get('pnu');
        const color = getUseColor(usage);

        return new Style({
          fill: new Fill({ color: hexToRgba(color, selected ? Math.min(activeOpacity + 0.18, 0.96) : activeOpacity) }),
          stroke: new Stroke({
            color: selected ? '#facc15' : 'rgba(15, 23, 42, 0.58)',
            width: selected ? 3 : 0.8,
          }),
        });
      },
      zIndex: 3,
    });

    const overlay = new Overlay({
      element: popupElement.current,
      offset: [12, -12],
      positioning: 'bottom-left',
      stopEvent: false,
    });

    const map = new Map({
      target: mapElement.current,
      layers: [buildBaseLayer(), boundaryLayer, parcelLayer],
      overlays: [overlay],
      controls: defaultControls({ attribution: false, zoom: true, rotate: false }),
      interactions: defaultInteractions({ mouseWheelZoom: true }),
      view: new View({
        center: fromLonLat([127.109, 37.514]),
        zoom: 13,
        minZoom: 11,
        maxZoom: 20,
      }),
    });

    map.on('singleclick', (event) => {
      let picked = null;
      map.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer) => {
          if (layer === parcelLayer && feature.get('pnu')) {
            picked = feature;
            return true;
          }
          return false;
        },
        { hitTolerance: 4 },
      );

      if (!picked) {
        overlay.setPosition(undefined);
        onParcelSelect(null);
        return;
      }

      const properties = picked.getProperties();
      const selected = parcelByPnu.get(properties.pnu);
      onParcelSelect(selected || { type: 'Feature', geometry: null, properties });
      popupElement.current.innerHTML = popupHtml(properties);
      overlay.setPosition(event.coordinate);
    });

    map.on('pointermove', (event) => {
      const hit = map.hasFeatureAtPixel(event.pixel, { hitTolerance: 2 });
      map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    map.getView().on('change:resolution', () => {
      parcelSourceRef.current.changed();
    });

    mapRef.current = map;
    parcelLayerRef.current = parcelLayer;
    boundaryLayerRef.current = boundaryLayer;
    overlayRef.current = overlay;

    return () => {
      map.setTarget(null);
      mapRef.current = null;
    };
  }, [onParcelSelect, parcelByPnu]);

  useEffect(() => {
    const source = parcelSourceRef.current;
    source.clear();
    if (!parcels.length) return;

    source.addFeatures(
      geojson.readFeatures(
        { type: 'FeatureCollection', features: parcels },
        { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' },
      ),
    );

    const extent = source.getExtent();
    if (mapRef.current && extent.every(Number.isFinite)) {
      mapRef.current.getView().fit(extent, {
        padding: [70, 400, 70, 380],
        maxZoom: 15,
        duration: 500,
      });
    }
  }, [parcels]);

  useEffect(() => {
    const source = boundarySourceRef.current;
    source.clear();
    if (!boundaries) return;

    source.addFeatures(
      geojson.readFeatures(boundaries, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      }),
    );
  }, [boundaries]);

  useEffect(() => {
    boundaryLayerRef.current?.setVisible(boundaryOn);
  }, [boundaryOn]);

  useEffect(() => {
    parcelLayerRef.current?.setVisible(parcelOn);
    parcelSourceRef.current.changed();
  }, [parcelOn, filters, opacity, selectedParcel]);

  return (
    <>
      <div ref={mapElement} className="map-container" />
      <div ref={popupElement} className="parcel-popup" />
      <div className="zoom-hint">필지는 줌 14 이상에서 표시됩니다.</div>
    </>
  );
}

export default MapView;

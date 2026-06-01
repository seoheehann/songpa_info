import { useEffect, useMemo, useState } from 'react';
import MapView from './components/MapView';
import LeftControlPanel from './components/LeftControlPanel';
import RightInfoPanel from './components/RightInfoPanel';
import { loadBoundaries, loadParcels } from './utils/dataLoader';
import { buildSummary, buildUsageStats } from './utils/spatialJoin';
import { USAGE_TYPES } from './utils/colorMap';

const defaultFilters = Object.fromEntries(USAGE_TYPES.map((type) => [type, true]));

function App() {
  const [parcels, setParcels] = useState([]);
  const [boundaries, setBoundaries] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [opacity, setOpacity] = useState(0.68);
  const [boundaryOn, setBoundaryOn] = useState(true);
  const [parcelOn, setParcelOn] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [loadState, setLoadState] = useState({ loading: true, error: '' });

  useEffect(() => {
    async function fetchData() {
      setLoadState({ loading: true, error: '' });
      const [parcelData, boundaryData] = await Promise.all([
        loadParcels(),
        loadBoundaries(),
      ]);
      setParcels(parcelData.features || []);
      setBoundaries(boundaryData);
      setLoadState({ loading: false, error: '' });
    }

    fetchData().catch((error) => {
      console.error(error);
      setLoadState({ loading: false, error: error.message || '데이터를 불러오지 못했습니다.' });
    });
  }, []);

  const summary = useMemo(() => buildSummary(parcels), [parcels]);
  const usageStats = useMemo(() => buildUsageStats(parcels), [parcels]);

  const toggleFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="app-shell">
      <MapView
        boundaries={boundaries}
        parcels={parcels}
        filters={filters}
        opacity={opacity}
        boundaryOn={boundaryOn}
        parcelOn={parcelOn}
        selectedParcel={selectedParcel}
        onParcelSelect={setSelectedParcel}
      />
      <LeftControlPanel
        title="송파구 필지 데이터 뷰어"
        stats={summary}
        filters={filters}
        toggleFilter={toggleFilter}
        opacity={opacity}
        setOpacity={setOpacity}
        boundaryOn={boundaryOn}
        setBoundaryOn={setBoundaryOn}
        parcelOn={parcelOn}
        setParcelOn={setParcelOn}
        loadState={loadState}
      />
      <RightInfoPanel
        selectedParcel={selectedParcel}
        summary={summary}
        usageStats={usageStats}
        onClose={() => setSelectedParcel(null)}
        loadState={loadState}
      />
    </div>
  );
}

export default App;

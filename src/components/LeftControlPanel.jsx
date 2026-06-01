import Legend from './Legend';
import { formatNumber } from '../utils/spatialJoin';

function LeftControlPanel({
  title,
  stats,
  filters,
  toggleFilter,
  opacity,
  setOpacity,
  boundaryOn,
  setBoundaryOn,
  parcelOn,
  setParcelOn,
  loadState,
}) {
  return (
    <aside className="control-panel left-panel">
      <div className="panel-header">
        <p className="eyebrow">Songpa GIS</p>
        <h1>{title}</h1>
      </div>

      <div className="panel-body">
        {loadState.error && <div className="panel-alert">{loadState.error}</div>}
        <div className="summary-row">
          <div>
            <strong>총 필지 수</strong>
            <span>{loadState.loading ? '로딩 중' : `${formatNumber(stats.totalParcels)}개`}</span>
          </div>
          <div>
            <strong>건물 수</strong>
            <span>{loadState.loading ? '로딩 중' : `${formatNumber(stats.buildingCount)}개`}</span>
          </div>
        </div>

        <div className="control-section">
          <h2>레이어</h2>
          <label className="switch-row">
            <input type="checkbox" checked={boundaryOn} onChange={() => setBoundaryOn((value) => !value)} />
            <span>행정동 경계</span>
          </label>
          <label className="switch-row">
            <input type="checkbox" checked={parcelOn} onChange={() => setParcelOn((value) => !value)} />
            <span>필지 레이어</span>
          </label>
        </div>

        <div className="control-section">
          <h2>주용도 필터</h2>
          <div className="filter-grid">
            {Object.keys(filters).map((key) => (
              <label key={key} className="filter-chip">
                <input type="checkbox" checked={filters[key]} onChange={() => toggleFilter(key)} />
                <span>{key}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="control-section">
          <div className="range-head">
            <h2>필지 투명도</h2>
            <span>{Math.round(opacity * 100)}%</span>
          </div>
          <input
            className="range-input"
            type="range"
            min="0.15"
            max="0.95"
            step="0.05"
            value={opacity}
            onChange={(event) => setOpacity(Number(event.target.value))}
          />
        </div>

        <Legend filters={filters} />
      </div>
    </aside>
  );
}

export default LeftControlPanel;

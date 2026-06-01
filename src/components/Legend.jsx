import { usageColorMap } from '../utils/colorMap';

function Legend({ filters }) {
  return (
    <div className="legend-card">
      <h2>범례</h2>
      <div className="legend-items">
        {Object.entries(usageColorMap).map(([label, color]) => (
          <div key={label} className={`legend-item ${filters?.[label] ? '' : 'muted'}`}>
            <span className="legend-swatch" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Legend;

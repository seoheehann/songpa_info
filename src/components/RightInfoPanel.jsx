import UsageChart from './UsageChart';
import { formatNumber } from '../utils/spatialJoin';

function Field({ label, value, suffix = '' }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <>
      <dt>{label}</dt>
      <dd>{empty ? '-' : `${value}${suffix}`}</dd>
    </>
  );
}

function NumberField({ label, value, suffix = '', digits = 0 }) {
  return <Field label={label} value={value === null || value === undefined ? '' : formatNumber(value, digits)} suffix={suffix} />;
}

function SummaryPanel({ summary, usageStats, loadState }) {
  return (
    <aside className="control-panel right-panel">
      <div className="panel-header">
        <p className="eyebrow">District Overview</p>
        <h2>송파구 전체 통계</h2>
      </div>

      <div className="panel-body">
        {loadState.loading && <div className="panel-alert">필지 데이터를 불러오는 중입니다.</div>}
        <div className="metric-grid">
          <div className="stat-card">
            <div className="stat-title">전체 필지 수</div>
            <div className="stat-value">{formatNumber(summary.totalParcels)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">총 면적</div>
            <div className="stat-value">{formatNumber(summary.parcelArea, 0)}㎡</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">건물 수</div>
            <div className="stat-value">{formatNumber(summary.buildingCount)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">총 연면적</div>
            <div className="stat-value">{formatNumber(summary.grossFloorArea, 0)}㎡</div>
          </div>
        </div>

        <UsageChart data={usageStats} />

        <div className="usage-table">
          <div className="table-row header">
            <span>주용도</span>
            <span>필지 수</span>
            <span>연면적</span>
            <span>비율</span>
          </div>
          {usageStats.map((row) => (
            <div key={row.type} className="table-row">
              <span>{row.type}</span>
              <span>{formatNumber(row.count)}</span>
              <span>{formatNumber(row.grossFloorArea, 0)}</span>
              <span>{(row.ratio * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function DetailPanel({ selectedParcel, onClose }) {
  const props = selectedParcel.properties || {};

  return (
    <aside className="control-panel right-panel">
      <div className="panel-header detail-header">
        <div>
          <p className="eyebrow">Selected Parcel</p>
          <h2>선택 필지 상세</h2>
          <div className="subhead">PNU {props.pnu}</div>
        </div>
        <button className="close-button" type="button" onClick={onClose}>닫기</button>
      </div>

      <div className="panel-body">
        <div className="detail-section">
          <h3>필지 정보</h3>
          <dl>
            <Field label="PNU" value={props.pnu} />
            <Field label="주소" value={props.address} />
            <Field label="지목" value={props.landCategory} />
            <NumberField label="면적" value={props.area} suffix="㎡" digits={1} />
            <NumberField label="공시지가" value={props.assessedValue} suffix="원/㎡" />
            <Field label="용도지역" value={props.useRegion} />
            <Field label="용도지구" value={props.useDistrict} />
            <Field label="용도구역" value={props.useZone} />
          </dl>
        </div>

        <div className="detail-section">
          <h3>건축물 정보</h3>
          <dl>
            <Field label="건축물명" value={props.buildingName} />
            <Field label="주용도" value={props.mainUse} />
            <Field label="구조" value={props.structure} />
            <Field label="사용승인일" value={props.approvalDate} />
            <NumberField label="건축면적" value={props.buildingArea} suffix="㎡" digits={1} />
            <NumberField label="연면적" value={props.grossFloorArea} suffix="㎡" digits={1} />
            <NumberField label="건폐율" value={props.coverageRatio} suffix="%" digits={1} />
            <NumberField label="용적률" value={props.floorAreaRatio} suffix="%" digits={1} />
            <NumberField label="지상층수" value={props.groundFloors} suffix="층" />
            <NumberField label="지하층수" value={props.basementFloors} suffix="층" />
          </dl>
        </div>

        <div className="detail-section">
          <h3>통계 정보</h3>
          <dl>
            <Field label="해당 집계구 코드" value={props.statsCode} />
            <NumberField label="총인구" value={props.population} suffix="명" />
            <NumberField label="세대수" value={props.households} suffix="세대" />
            <Field label="연령대별 인구" value={props.agePopulation} />
            <Field label="가구 구성" value={props.householdComposition} />
          </dl>
          <p className="data-note">집계구 통계 원본이 추가되면 PNU 또는 공간조인 기준으로 연결하도록 준비해두었습니다.</p>
        </div>
      </div>
    </aside>
  );
}

function RightInfoPanel({ selectedParcel, summary, usageStats, onClose, loadState }) {
  if (selectedParcel) {
    return <DetailPanel selectedParcel={selectedParcel} onClose={onClose} />;
  }

  return <SummaryPanel summary={summary} usageStats={usageStats} loadState={loadState} />;
}

export default RightInfoPanel;

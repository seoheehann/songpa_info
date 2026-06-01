import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { usageColorMap } from '../utils/colorMap';
import { formatNumber } from '../utils/spatialJoin';

function UsageChart({ data }) {
  const chartData = data.map((item) => ({
    name: item.type,
    value: Number(item.area.toFixed(1)),
  }));

  return (
    <div className="usage-chart-card">
      <div className="section-title">주용도별 면적 비율</div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            stroke="rgba(15,23,42,0.8)"
            strokeWidth={2}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={usageColorMap[entry.name] || usageColorMap.기타} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.94)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: 8,
              color: '#f8fafc',
            }}
            formatter={(value) => `${formatNumber(value, 1)}㎡`}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default UsageChart;

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const OccupancyTrendChart = ({ data }) => {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
      <h3 className="text-white mb-4">Occupancy Trend</h3>

      <div className="h-64">
        <ResponsiveContainer>
          <LineChart data={data}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="occupancy" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default OccupancyTrendChart;
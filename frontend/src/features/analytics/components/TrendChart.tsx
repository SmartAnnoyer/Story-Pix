import { Card, Empty } from 'antd';

interface TrendChartProps {
  title: string;
  data: Array<{ label: string; value: number }>;
}

export const TrendChart = ({ title, data }: TrendChartProps) => {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <Card title={title}>
      {!data.length ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data for selected range" />
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>{item.label}</span>
                <span>{item.value}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

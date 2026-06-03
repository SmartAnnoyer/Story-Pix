import { Card, Statistic } from 'antd';

interface StatCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  precision?: number;
}

export const StatCard = ({ title, value, suffix, precision }: StatCardProps) => (
  <Card>
    <Statistic title={title} value={value} suffix={suffix} precision={precision} />
  </Card>
);

interface StatsGridProps {
  items: StatCardProps[];
}

export const StatsGrid = ({ items }: StatsGridProps) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {items.map((item) => (
      <StatCard key={item.title} {...item} />
    ))}
  </div>
);

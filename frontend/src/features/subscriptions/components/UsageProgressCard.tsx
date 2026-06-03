import { Card, Progress, Typography } from 'antd';

const { Text } = Typography;

interface UsageProgressCardProps {
  title: string;
  used: number;
  limit: number | null;
  percent: number;
  unit?: string;
}

export const UsageProgressCard = ({
  title,
  used,
  limit,
  percent,
  unit = '',
}: UsageProgressCardProps) => {
  const unlimited = limit === null;

  return (
    <Card className="h-full">
      <Text type="secondary" className="text-sm">
        {title}
      </Text>
      <div className="mt-2 text-2xl font-semibold">
        {used}
        {unit}
      </div>
      <Progress percent={unlimited ? 0 : percent} size="small" className="mt-3" showInfo={!unlimited} />
      <Text type="secondary" className="mt-2 block text-xs">
        {unlimited ? 'Unlimited' : `of ${limit}${unit}`}
      </Text>
    </Card>
  );
};

import { DatePicker, Select, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { AnalyticsEventType } from '@/types/analytics.types';

const { RangePicker } = DatePicker;

interface DateRangeFilterProps {
  from?: string;
  to?: string;
  onChange: (from?: string, to?: string) => void;
}

export const DateRangeFilter = ({ from, to, onChange }: DateRangeFilterProps) => {
  const value: [Dayjs, Dayjs] | null =
    from && to ? [dayjs(from), dayjs(to)] : null;

  return (
    <RangePicker
      value={value}
      onChange={(dates) => {
        if (!dates?.[0] || !dates?.[1]) {
          onChange(undefined, undefined);
          return;
        }
        onChange(dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD'));
      }}
    />
  );
};

interface EventTypeFilterProps {
  value?: AnalyticsEventType;
  onChange: (value?: AnalyticsEventType) => void;
}

export const EventTypeFilter = ({ value, onChange }: EventTypeFilterProps) => (
  <Select
    allowClear
    placeholder="Event type"
    className="min-w-[220px]"
    value={value}
    onChange={onChange}
    options={Object.values(AnalyticsEventType).map((eventType) => ({
      value: eventType,
      label: eventType.replace(/_/g, ' '),
    }))}
  />
);

interface AnalyticsFiltersProps {
  from?: string;
  to?: string;
  eventType?: AnalyticsEventType;
  onDateChange: (from?: string, to?: string) => void;
  onEventTypeChange: (eventType?: AnalyticsEventType) => void;
}

export const AnalyticsFilters = ({
  from,
  to,
  eventType,
  onDateChange,
  onEventTypeChange,
}: AnalyticsFiltersProps) => (
  <Space wrap className="mb-6">
    <DateRangeFilter from={from} to={to} onChange={onDateChange} />
    <EventTypeFilter value={eventType} onChange={onEventTypeChange} />
  </Space>
);

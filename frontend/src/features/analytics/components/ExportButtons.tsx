import { Button, Dropdown } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

interface ExportButtonsProps {
  onExport: (format: 'csv' | 'xlsx') => void;
  loading?: boolean;
}

export const ExportButtons = ({ onExport, loading }: ExportButtonsProps) => {
  const items: MenuProps['items'] = [
    { key: 'csv', label: 'Export CSV', onClick: () => onExport('csv') },
    { key: 'xlsx', label: 'Export Excel', onClick: () => onExport('xlsx') },
  ];

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <Button icon={<DownloadOutlined />} loading={loading}>
        Export
      </Button>
    </Dropdown>
  );
};

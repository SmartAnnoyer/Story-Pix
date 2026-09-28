import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { getErrorMessage } from '@/api/client';
import { useAdminStudioScanUsageQuery, useTopUpScansMutation } from '@/hooks/usePackQueries';
import type { ScanUsagePhoto, StudioScanUsageAlbum } from '@/types/pack.types';

const { Paragraph, Text } = Typography;

type RenewTarget = {
  album: StudioScanUsageAlbum;
  photo: ScanUsagePhoto | null;
};

const formatPlays = (photo: ScanUsagePhoto) =>
  `${photo.scanUsage.toLocaleString('en-IN')} / ${photo.scanLimit.toLocaleString('en-IN')}`;

export const AdminScanRenewalsCard = ({ studioId }: { studioId: string }) => {
  const { data: albums = [], isLoading } = useAdminStudioScanUsageQuery(studioId);
  const topUpMutation = useTopUpScansMutation();
  const [target, setTarget] = useState<RenewTarget | null>(null);
  const [form] = Form.useForm<{ additionalScans: number; notes?: string }>();

  const openRenew = (album: StudioScanUsageAlbum, photo: ScanUsagePhoto | null) => {
    form.setFieldsValue({ additionalScans: 1000, notes: '' });
    setTarget({ album, photo });
  };

  const handleSubmit = async (values: { additionalScans: number; notes?: string }) => {
    if (!target) return;
    try {
      const result = await topUpMutation.mutateAsync({
        studioId,
        albumId: target.album.id,
        additionalScans: values.additionalScans,
        arTargetIds: target.photo ? [target.photo.id] : undefined,
        notes: values.notes?.trim() || undefined,
      });
      message.success(
        `+${values.additionalScans.toLocaleString('en-IN')} plays added to ${result.renewedCount} photo${
          result.renewedCount === 1 ? '' : 's'
        }`,
      );
      setTarget(null);
    } catch (error) {
      message.error(getErrorMessage(error, 'Could not renew plays'));
    }
  };

  return (
    <Card title="Guest plays · renewals" className="mb-6">
      <Paragraph type="secondary" className="!mb-4">
        Each mapped photo has a lifetime play limit. When it runs out, guests see “plays finished”.
        Add plays for free here (offline payment, goodwill, support). Studios can also renew and pay
        themselves from their album’s Link page.
      </Paragraph>

      <Table
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={albums}
        pagination={albums.length > 10 ? { pageSize: 10 } : false}
        locale={{ emptyText: 'No albums yet' }}
        expandable={{
          rowExpandable: (album) => album.photoCount > 0,
          expandedRowRender: (album) => (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={album.photos}
              columns={[
                { title: 'Photo', dataIndex: 'targetName', ellipsis: true },
                {
                  title: 'Plays used',
                  key: 'plays',
                  render: (_, photo) => (
                    <Text type={photo.scansExhausted ? 'danger' : undefined}>
                      {formatPlays(photo)}
                    </Text>
                  ),
                },
                {
                  title: 'State',
                  key: 'state',
                  render: (_, photo) =>
                    photo.scansExhausted ? (
                      <Tag color="red">Finished</Tag>
                    ) : photo.scanUsage >= photo.scanLimit * 0.8 ? (
                      <Tag color="gold">Low</Tag>
                    ) : (
                      <Tag color="green">OK</Tag>
                    ),
                },
                {
                  title: '',
                  key: 'action',
                  align: 'right',
                  render: (_, photo) => (
                    <Button size="small" onClick={() => openRenew(album, photo)}>
                      Add plays
                    </Button>
                  ),
                },
              ]}
            />
          ),
        }}
        columns={[
          {
            title: 'Album',
            key: 'album',
            render: (_, album) => (
              <>
                <Text strong>{album.albumName}</Text>
                <br />
                <Text type="secondary">{album.albumCode}</Text>
              </>
            ),
          },
          { title: 'Photos', dataIndex: 'photoCount' },
          {
            title: 'Finished',
            dataIndex: 'exhaustedCount',
            render: (count: number) =>
              count > 0 ? <Tag color="red">{count} finished</Tag> : <Text type="secondary">—</Text>,
          },
          {
            title: '',
            key: 'action',
            align: 'right',
            render: (_, album) => (
              <Button
                type={album.exhaustedCount > 0 ? 'primary' : 'default'}
                size="small"
                disabled={album.photoCount === 0}
                onClick={() => openRenew(album, null)}
              >
                Add plays to all
              </Button>
            ),
          },
        ]}
      />

      <Modal
        open={Boolean(target)}
        title="Add guest plays"
        onCancel={() => setTarget(null)}
        okText="Add plays"
        confirmLoading={topUpMutation.isPending}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        {target ? (
          <Paragraph>
            {target.photo ? (
              <>
                Photo <Text strong>{target.photo.targetName}</Text> in{' '}
                <Text strong>{target.album.albumName}</Text> · currently {formatPlays(target.photo)}
              </>
            ) : (
              <>
                All <Text strong>{target.album.photoCount}</Text> photos in{' '}
                <Text strong>{target.album.albumName}</Text>
              </>
            )}
          </Paragraph>
        ) : null}
        <Form form={form} layout="vertical" onFinish={handleSubmit} preserve={false}>
          <Form.Item
            name="additionalScans"
            label="Plays to add per photo"
            rules={[{ required: true, message: 'Enter plays to add' }]}
          >
            <InputNumber min={1} max={100000} step={1000} className="w-full" />
          </Form.Item>
          <Form.Item name="notes" label="Note">
            <Input.TextArea rows={2} placeholder="Optional (cash payment, goodwill, support…)" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

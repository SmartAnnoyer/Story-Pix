import { CopyOutlined, KeyOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Descriptions, Space, Typography, message } from 'antd';
import type { StudioAdminAccess } from '@/types/studio.types';

const { Text, Paragraph } = Typography;

interface StudioAdminAccessCardProps {
  adminAccess: StudioAdminAccess | null | undefined;
  onResetPassword?: () => void;
  isResetting?: boolean;
}

const copyToClipboard = async (label: string, value: string) => {
  await navigator.clipboard.writeText(value);
  message.success(`${label} copied`);
};

export const StudioAdminAccessCard = ({
  adminAccess,
  onResetPassword,
  isResetting = false,
}: StudioAdminAccessCardProps) => {
  if (!adminAccess) {
    return (
      <Alert
        type="warning"
        showIcon
        className="mb-6"
        message="Studio admin account not found"
      />
    );
  }

  if (adminAccess.passwordChanged || !adminAccess.temporaryPassword) {
    return (
      <Alert
        type="info"
        showIcon
        icon={<KeyOutlined />}
        className="mb-6"
        message="Studio admin has changed their password"
        description={
          <Space direction="vertical" size="small">
            <Text>
              Login email: <Text strong>{adminAccess.email}</Text>
            </Text>
            <Paragraph type="secondary" className="!mb-0">
              The temporary password is no longer available. Generate a new one to sign in as this
              studio, or use Forgot password on the login page.
            </Paragraph>
            {onResetPassword ? (
              <Button
                icon={<ReloadOutlined />}
                loading={isResetting}
                onClick={onResetPassword}
              >
                Generate new temporary password
              </Button>
            ) : null}
          </Space>
        }
      />
    );
  }

  return (
    <Alert
      type="success"
      showIcon
      icon={<KeyOutlined />}
      className="mb-6"
      message="Studio admin login (password not changed yet)"
      description={
        <div className="mt-2">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Login URL">
              <Space>
                <Text code>http://localhost:5173/login</Text>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => void copyToClipboard('Login URL', 'http://localhost:5173/login')}
                >
                  Copy
                </Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Admin email">
              <Space>
                <Text strong>{adminAccess.email}</Text>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => void copyToClipboard('Email', adminAccess.email)}
                >
                  Copy
                </Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Temporary password">
              <Space>
                <Text code>{adminAccess.temporaryPassword}</Text>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() =>
                    void copyToClipboard('Password', adminAccess.temporaryPassword ?? '')
                  }
                >
                  Copy
                </Button>
              </Space>
            </Descriptions.Item>
          </Descriptions>
          <Paragraph type="secondary" className="!mt-3 !mb-0">
            Email delivery requires a verified domain in Resend. Until then, use these credentials
            here or in the backend console logs.
          </Paragraph>
        </div>
      }
    />
  );
};

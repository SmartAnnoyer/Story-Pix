import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

interface EmailTemplatePreviewProps {
  subject: string;
  html: string;
}

export const EmailTemplatePreview = ({ subject, html }: EmailTemplatePreviewProps) => {
  return (
    <Card>
      <Title level={5}>Subject: {subject}</Title>
      <Paragraph type="secondary">HTML preview</Paragraph>
      <div
        className="rounded border border-gray-200 bg-white p-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Card>
  );
};

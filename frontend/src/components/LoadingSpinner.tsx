import { Spin } from 'antd';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  tip?: string;
}

export const LoadingSpinner = ({ fullScreen = false, tip = 'Loading...' }: LoadingSpinnerProps) => {
  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" tip={tip} />
      </div>
    );
  }

  return <Spin tip={tip} />;
};

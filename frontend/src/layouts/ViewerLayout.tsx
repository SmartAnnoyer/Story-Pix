import { Outlet } from 'react-router-dom';
import { ViewerDebugConsole } from '@/features/ar/components/ViewerDebugConsole';
import './ViewerLayout.css';

export const ViewerLayout = () => {
  return (
    <div className="viewer-shell">
      <Outlet />
      <ViewerDebugConsole />
    </div>
  );
};

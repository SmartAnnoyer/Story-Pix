import { Outlet } from 'react-router-dom';
import './ViewerLayout.css';

export const ViewerLayout = () => {
  return (
    <div className="viewer-shell">
      <Outlet />
    </div>
  );
};

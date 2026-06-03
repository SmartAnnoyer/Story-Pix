import { Outlet } from 'react-router-dom';

export const ViewerLayout = () => {
  return (
    <div className="min-h-[100dvh] bg-black">
      <Outlet />
    </div>
  );
};

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <Sidebar />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

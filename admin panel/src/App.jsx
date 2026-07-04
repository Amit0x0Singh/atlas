import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ResourcePage from './pages/ResourcePage.jsx';
import { resources } from './data/resources.js';
import { ToastProvider } from './components/common/Toast.jsx';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          {resources.map((resource) => (
            <Route
              key={resource.key}
              path={resource.path}
              element={<ResourcePage resource={resource} />}
            />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}

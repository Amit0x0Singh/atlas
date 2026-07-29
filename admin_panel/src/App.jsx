import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ResourcePage from './pages/ResourcePage.jsx';
import BackupRestorePage from './pages/BackupRestorePage.jsx';
import DataManagementPage from './pages/DataManagementPage.jsx';
import Login from './pages/Login.jsx';
import { resources } from './data/resources.js';
import { ToastProvider } from './components/common/Toast.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

function AuthedApp() {
  const { user } = useAuth();
  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="backup-restore" element={<BackupRestorePage />} />
        <Route path="data-management" element={<DataManagementPage />} />
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
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthedApp />
      </ToastProvider>
    </AuthProvider>
  );
}

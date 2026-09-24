import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import SignIn from './pages/Authentication/SignIn';
import DataPegawai from './pages/DataPegawai';
import ECommerce from './pages/Dashboard/ECommerce';
import DocumentTemplate from './pages/DocumentTemplate';
import ProcurementCreate from './pages/ProcurementCreate';
import ProcurementDocument from './pages/ProcurementDocument';
import ProcurementList from './pages/ProcurementList';
import UserManagement from './pages/UserManagement';
import DefaultLayout from './layout/DefaultLayout';

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const { pathname } = useLocation();
  const isAuthPage = pathname === '/' || pathname.startsWith('/auth');
  const appName = 'SIPINTAR - Sistem Pengadaan Internal';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const routes = (
    <Routes>
      <Route
        index
        element={
          <>
            <PageTitle title={`Login | ${appName}`} />
            <SignIn />
          </>
        }
      />
      <Route
        path="/dashboard"
        element={
          <>
            <PageTitle title={`Dashboard | ${appName}`} />
            <ECommerce />
          </>
        }
      />
      <Route
        path="/manajemen-pengguna"
        element={
          <>
            <PageTitle title={`Manajemen Pengguna | ${appName}`} />
            <UserManagement />
          </>
        }
      />
      <Route
        path="/pengadaan"
        element={
          <>
            <PageTitle title={`Pengadaan | ${appName}`} />
            <ProcurementList />
          </>
        }
      />
      <Route
        path="/pengadaan/tambah"
        element={
          <>
            <PageTitle title={`Tambah Pengadaan | ${appName}`} />
            <ProcurementCreate />
          </>
        }
      />
      <Route
        path="/pengadaan/edit/:id"
        element={
          <>
            <PageTitle title={`Edit Pengadaan | ${appName}`} />
            <ProcurementCreate mode="edit" />
          </>
        }
      />
      <Route
        path="/pengadaan/:id/dokumen/:documentIndex/:action"
        element={
          <>
            <PageTitle title={`Dokumen Pengadaan | ${appName}`} />
            <ProcurementDocument />
          </>
        }
      />
      <Route
        path="/glossary/data-pegawai"
        element={
          <>
            <PageTitle title={`Data Pegawai | ${appName}`} />
            <DataPegawai />
          </>
        }
      />
      <Route
        path="/glossary/template-dokumen"
        element={
          <>
            <PageTitle title={`Template Dokumen | ${appName}`} />
            <DocumentTemplate />
          </>
        }
      />
      <Route
        path="/auth/signin"
        element={<Navigate to="/" replace />}
      />
      <Route
        path="/auth/*"
        element={<Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );

  return (
    <>
      <Toaster position="top-right" />
      {loading ? (
        <Loader />
      ) : isAuthPage ? (
        routes
      ) : (
        <DefaultLayout>{routes}</DefaultLayout>
      )}
    </>
  );
}

export default App;

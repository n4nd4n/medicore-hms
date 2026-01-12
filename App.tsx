
import React, { useState } from 'react';
import { StoreProvider, useStore } from './store/StoreContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import PatientDashboard from './pages/PatientDashboard';
import { Role } from './types';
import { LogOutIcon, StethoscopeIcon } from './components/Icons';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout } = useStore();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      {currentUser && (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                 <div className="bg-primary-600 p-2 rounded-lg">
                    <StethoscopeIcon className="text-white w-6 h-6" />
                 </div>
                 <span className="ml-3 text-xl font-bold text-gray-900 tracking-tight">MediCore</span>
              </div>
              <div className="flex items-center space-x-4">
                 <div className="hidden md:flex flex-col items-end mr-2">
                    <span className="text-sm font-semibold text-gray-700">{currentUser.name}</span>
                    <span className="text-xs text-gray-500">{currentUser.role}</span>
                 </div>
                 <img 
                   src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name}&background=random`}
                   alt="Profile"
                   className="w-9 h-9 rounded-full object-cover border border-gray-200 shadow-sm"
                 />
                 <button 
                  onClick={logout}
                  className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Logout"
                 >
                   <LogOutIcon />
                 </button>
              </div>
            </div>
          </div>
        </nav>
      )}
      
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { currentUser } = useStore();
  const [isLogin, setIsLogin] = useState(true);

  if (!currentUser) {
    return isLogin ? (
      <Login onToggleAuth={() => setIsLogin(false)} />
    ) : (
      <Signup onToggleAuth={() => setIsLogin(true)} />
    );
  }

  return (
    <MainLayout>
      {currentUser.role === Role.ADMIN ? <AdminDashboard /> : <PatientDashboard />}
    </MainLayout>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;

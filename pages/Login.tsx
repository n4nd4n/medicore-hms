import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { UserIcon, LockIcon, StethoscopeIcon } from '../components/Icons';
import { supabase } from '../lib/supabaseClient';
import { Role } from '../types';


interface LoginProps {
  onToggleAuth: () => void;
}

const Login: React.FC<LoginProps> = ({ onToggleAuth }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, signup } = useStore();


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  try {
    // 1️⃣ Check Supabase: does a user with this email + password exist?
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) {
      setError('Invalid credentials.');
      return;
    }

    // 2️⃣ Try existing local login (if user already in store/localStorage)
    const ok = login(email, password);

    if (!ok) {
      // 3️⃣ If not in store, create user in store using Supabase profile
      signup({
        name: data.name,
        email: data.email,
        password,
        phone: data.phone ?? '',
        role: data.role === 'admin' ? Role.ADMIN : Role.PATIENT,
        address: data.address ?? undefined,
        avatar:
          data.avatar_url ??
          `https://ui-avatars.com/api/?name=${data.name}&background=random`
      });
    }

    // If we reach here: login is successful (Supabase said OK)

  } catch (err) {
    console.error(err);
    setError('Something went wrong. Try again.');
  }
};

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Branding Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 to-primary-900 relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
           <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
           <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shadow-lg">
               <StethoscopeIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">MediCore HMS</h1>
          </div>
        </div>

        <div className="relative z-10 space-y-10">
           <div className="group cursor-default transform transition-all duration-500 hover:scale-105 hover:pl-4 border-l-4 border-transparent hover:border-white/30">
             <h2 className="text-4xl font-bold mb-2 drop-shadow-md">Your Health, Our Priority</h2>
             <p className="text-primary-100 text-xl opacity-90 font-light">Experience world-class healthcare management at your fingertips.</p>
           </div>
           
           <div className="group cursor-default transform transition-all duration-500 hover:scale-105 hover:pl-4 border-l-4 border-transparent hover:border-white/30">
             <h2 className="text-4xl font-bold mb-2 drop-shadow-md">Advanced Medicine</h2>
             <p className="text-primary-100 text-xl opacity-90 font-light">Connecting you with top specialists and modern treatments.</p>
           </div>

           <div className="group cursor-default transform transition-all duration-500 hover:scale-105 hover:pl-4 border-l-4 border-transparent hover:border-white/30">
             <h2 className="text-4xl font-bold mb-2 drop-shadow-md">Seamless Care</h2>
             <p className="text-primary-100 text-xl opacity-90 font-light">Manage appointments and records with ease.</p>
           </div>
        </div>

        <div className="relative z-10 text-sm text-primary-200 font-medium">
          © 2024 MediCore Healthcare Systems. <br/>Innovating for a healthier tomorrow.
        </div>
      </div>

      {/* Right Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-primary-50/30">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 animate-fade-in-up border border-gray-100">
          <div className="text-center mb-8 lg:hidden">
            <div className="flex justify-center mb-4">
               <div className="bg-primary-600 p-3 rounded-xl shadow-lg">
                  <StethoscopeIcon className="w-10 h-10 text-white" />
               </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-800">MediCore</h2>
            <p className="text-gray-500 mt-2">Hospital Management System</p>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-gray-500 mt-2">Sign in to access your dashboard</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="text-gray-400 w-5 h-5 group-focus-within:text-primary-500 transition-colors" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-150 ease-in-out"
                placeholder="Email address"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockIcon className="text-gray-400 w-5 h-5 group-focus-within:text-primary-500 transition-colors" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-150 ease-in-out"
                placeholder="Password"
              />
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transform hover:-translate-y-0.5"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button onClick={onToggleAuth} className="font-bold text-primary-600 hover:text-primary-500 transition-colors hover:underline">
                Sign up now
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
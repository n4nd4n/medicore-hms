
import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { Role } from '../types';
import { UserIcon, LockIcon, MapPinIcon, PhoneIcon } from '../components/Icons';
import { supabase } from '../lib/supabaseClient';


interface SignupProps {
  onToggleAuth: () => void;
}

const Signup: React.FC<SignupProps> = ({ onToggleAuth }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<Role>(Role.PATIENT);
  const [error, setError] = useState('');
  const { signup } = useStore();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  // Phone validation: Strip non-digits and check length
  const phoneDigits = phone.replace(/\D/g, '');
  
  if (phoneDigits.length !== 10) {
    setError('Invalid number: Phone number must be exactly 10 digits.');
    return;
  }

  const fullPhone = `+91 ${phoneDigits}`;
  const normalizedRole = role === Role.ADMIN ? 'admin' : 'patient';

  try {
    const id = crypto.randomUUID();

    const { error: dbError } = await supabase.from('profiles').insert({
      id,
      name,
      email,
      phone: fullPhone,
      role: normalizedRole,
      address: role === Role.PATIENT ? address : null,
      avatar_url: `https://ui-avatars.com/api/?name=${name}&background=random`,
      password  // 👈 save password in Supabase
    });


    if (dbError) {
      console.error('Supabase insert error:', dbError);
      setError(dbError.message);
      return;
    }

    signup({ 
      name, 
      email, 
      password,
      phone: fullPhone,
      role, 
      address: role === Role.PATIENT ? address : undefined,
      avatar: `https://ui-avatars.com/api/?name=${name}&background=random` 
    });

  } catch (err) {
    console.error(err);
    setError('Something went wrong. Please try again.');
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 animate-fade-in-up">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Create Account</h2>
          <p className="text-gray-500 mt-2">Join MediCore today</p>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center border border-red-100 animate-fade-in">
              {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="text-gray-400 w-5 h-5" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <PhoneIcon className="text-gray-400 w-5 h-5" />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="98765 43210"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-1">Enter 10-digit mobile number</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockIcon className="text-gray-400 w-5 h-5" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">I am a:</label>
             <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setRole(Role.PATIENT)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all ${role === Role.PATIENT ? 'border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => setRole(Role.ADMIN)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all ${role === Role.ADMIN ? 'border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Admin
                </button>
             </div>
          </div>

          {role === Role.PATIENT && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-gray-700 mb-1">Residence Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPinIcon className="text-gray-400 w-5 h-5" />
                </div>
                <input
                  type="text"
                  required={role === Role.PATIENT}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="123 Main St, City"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 mt-4 border border-transparent text-sm font-medium rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-lg shadow-primary-500/30"
          >
            Create Account
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button onClick={onToggleAuth} className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;

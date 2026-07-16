import React, { useState } from 'react';
import { api } from '../api';
import { Shield, Mail, Lock, User, Activity } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ENGINEER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const data = await api.login({ username, password });
        localStorage.setItem('frex_token', data.token);
        localStorage.setItem('frex_user', JSON.stringify(data));
        onAuthSuccess(data);
      } else {
        const data = await api.register({ username, email, password, role });
        localStorage.setItem('frex_token', data.token);
        localStorage.setItem('frex_user', JSON.stringify(data));
        onAuthSuccess(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-height-[100vh] bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center space-x-2">
          <div className="p-2 bg-gradient-to-tr from-cyan-500 to-violet-600 rounded-lg shadow-lg">
            <Activity className="h-8 w-8 text-white animate-pulse" />
          </div>
          <span className="font-sans font-extrabold text-3xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-violet-500">
            FREX-SOS
          </span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-100">
          {isLogin ? 'Sign in to Digital Twin Platform' : 'Create engineer account'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Or{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="font-medium text-cyan-400 hover:text-cyan-300 transition duration-150 ease-in-out cursor-pointer"
          >
            {isLogin ? 'register a new account' : 'sign in to your existing account'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-slate-900/60 backdrop-blur-xl py-8 px-6 shadow-2xl border border-slate-800 rounded-2xl sm:px-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-violet-500" />
          
          {error && (
            <div className="mb-4 bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300">
                Username
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-slate-950/80 border border-slate-800 text-slate-100 block w-full pl-10 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all sm:text-sm"
                  placeholder="john_doe"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                  Email address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-950/80 border border-slate-800 text-slate-100 block w-full pl-10 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all sm:text-sm"
                    placeholder="john@factory.com"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-950/80 border border-slate-800 text-slate-100 block w-full pl-10 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-slate-300">
                  Platform Role
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-slate-500" />
                  </div>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="bg-slate-950/80 border border-slate-800 text-slate-300 block w-full pl-10 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all sm:text-sm"
                  >
                    <option value="ENGINEER">Industrial Engineer</option>
                    <option value="ADMIN">System Administrator</option>
                    <option value="MANAGER">Production Manager</option>
                    <option value="TECHNICIAN">Maintenance Technician</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-violet-500 hover:from-cyan-300 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Executing...' : (isLogin ? 'Sign In' : 'Register Account')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

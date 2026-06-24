'use client';

import { useState, useEffect, ReactNode } from 'react';

// PROTOTYPE-ONLY mock auth gate. Real production deployment must replace
// this with the SCH-approved authentication system (SSO / username +
// password + 2FA / OIDC against SCH's identity provider). The username 123
// / password abc credentials below are placeholders printed to the screen
// so testers know what to type — DO NOT replicate this pattern in production.

const PROTOTYPE_USERNAME = '123';
const PROTOTYPE_PASSWORD = 'abc';

interface AuthGateProps {
  roleKey: string;
  roleLabel: string;
  children: ReactNode;
}

export default function AuthGate({ roleKey, roleLabel, children }: AuthGateProps) {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ok = window.sessionStorage.getItem(`tb-prototype-auth:${roleKey}`) === 'ok';
      setAuthed(ok);
      setChecked(true);
    }
  }, [roleKey]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === PROTOTYPE_USERNAME && password === PROTOTYPE_PASSWORD) {
      window.sessionStorage.setItem(`tb-prototype-auth:${roleKey}`, 'ok');
      setAuthed(true);
      setError('');
    } else {
      setError('Invalid username or password.');
    }
  };

  const handleSignOut = () => {
    window.sessionStorage.removeItem(`tb-prototype-auth:${roleKey}`);
    setAuthed(false);
    setUsername('');
    setPassword('');
  };

  if (!checked) {
    return <div className="min-h-screen bg-gray-100" />;
  }

  if (authed) {
    return (
      <div className="relative">
        <button
          onClick={handleSignOut}
          className="absolute top-2 right-2 z-50 px-2.5 py-1 bg-gray-700/70 text-white text-[10px] rounded hover:bg-gray-700"
          title="Sign out of this role (prototype mock auth)"
        >
          Sign out ({roleLabel})
        </button>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gray-800 text-white px-6 py-4">
          <h1 className="text-lg font-bold">{roleLabel}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Sign in to continue</p>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Username
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="Enter your username"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
          >
            Sign in
          </button>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => alert('Placeholder — production will route to SCH-approved registration flow.')}
              className="text-blue-600 hover:underline opacity-60"
            >
              Register for new account
            </button>
            <button
              type="button"
              onClick={() => alert('Placeholder — production will route to SCH-approved password reset.')}
              className="text-blue-600 hover:underline opacity-60"
            >
              Forgot username / password?
            </button>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 text-xs text-yellow-900 rounded leading-relaxed">
            <strong>Prototype testing credentials:</strong>{' '}
            username <code className="px-1 py-0.5 bg-yellow-100 rounded font-mono">123</code>{' '}
            and password <code className="px-1 py-0.5 bg-yellow-100 rounded font-mono">abc</code>.
            <br />
            This is a placeholder for the production authentication system
            that SCH&apos;s real deployment will require.
          </div>

          <div className="text-center">
            <a href="/" className="text-xs text-gray-500 hover:text-gray-700">
              ← Back to chatbot
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

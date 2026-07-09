import { useState } from 'react';
import { login, register } from './api';
import type { LoginRequest, RegisterRequest, AuthResponse } from './types';

interface AuthProps {
  onAuthSuccess: (response: AuthResponse) => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let response: AuthResponse;

      if (isLogin) {
        const loginData: LoginRequest = { email, password };
        response = await login(loginData);
      } else {
        if (!name.trim()) {
          setError('Name is required');
          setLoading(false);
          return;
        }
        const registerData: RegisterRequest = { email, password, name };
        response = await register(registerData);
      }

      onAuthSuccess(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authContainer">
      <div className="authCard">
        <div className="authHeader">
          <span className="authBrand">SB</span>
          <div>
            <h1>SpaceBook</h1>
            <p>{isLogin ? 'Sign in to your account' : 'Create your account'}</p>
          </div>
        </div>

        {error && (
          <div className="authError">
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="authForm">
          {!isLogin && (
            <label>
              Full Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required={!isLogin}
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              minLength={6}
            />
          </label>

          <button type="submit" className="primaryButton" disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="authSwitch">
          <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
          <button type="button" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        <div className="authDemo">
          <p>Demo accounts:</p>
          <div className="demoAccounts">
            <div>
              <strong>Admin:</strong> admin@spacebook.lk / admin123
            </div>
            <div>
              <strong>Owner:</strong> owner1@spacebook.lk / owner123
            </div>
            <div>
              <strong>Customer:</strong> customer@spacebook.lk / customer123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

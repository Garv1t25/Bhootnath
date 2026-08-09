import { useState } from 'react';
import { Lock, LogIn, Mail } from 'lucide-react';
import { apiRequest, getApiMessage } from '../api';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(await getApiMessage(response, 'Unable to sign in.'));
      }

      const { user } = await response.json();
      onLogin(user);
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card glass-panel" aria-labelledby="login-title">
        <div className="login-brand-mark">
          <Lock size={24} aria-hidden="true" />
        </div>
        <p className="login-eyebrow">Restaurant tracker</p>
        <h1 id="login-title">Sign in</h1>
        <p className="login-description">Use your account to manage subscriptions and customer plans.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Email address</span>
            <span className="login-input-wrap">
              <Mail size={18} aria-hidden="true" />
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </span>
          </label>

          <label className="login-field">
            <span>Password</span>
            <span className="login-input-wrap">
              <Lock size={18} aria-hidden="true" />
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
              />
            </span>
          </label>

          {error && <p className="login-error" role="alert">{error}</p>}

          <button className="btn btn-primary login-submit" type="submit" disabled={isSubmitting}>
            <LogIn size={18} aria-hidden="true" />
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
};

export default LoginPage;

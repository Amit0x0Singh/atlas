import { useState } from 'react';
import { LogIn, ShieldAlert } from 'lucide-react';
import Card from '../components/common/Card.jsx';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { normalizeEmailInput } from '../utils/textNormalize.js';

export default function Login() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(normalizeEmailInput(email), password);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base flex-shrink-0">A</div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Atlas</p>
            <p className="text-[11px] text-slate-400">Admin Data Panel</p>
          </div>
        </div>

        <Card className="space-y-4">
          <div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">Sign in</h1>
            <p className="text-xs text-slate-400 mt-0.5">Super-admin access only — this panel manages raw data across every table.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
                <ShieldAlert size={14} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" icon={LogIn} loading={loading} fullWidth>
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

/**
 * RegisterPage — fully working registration with validation.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

// ── Password strength helper ───────────────────────────────────────
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8)  score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const map = [
    { label: '',        color: '' },
    { label: 'Weak',    color: 'bg-red-400' },
    { label: 'Fair',    color: 'bg-amber-400' },
    { label: 'Good',    color: 'bg-blue-400' },
    { label: 'Strong',  color: 'bg-green-500' },
  ];
  return { score, ...map[score] };
}

// ── Reusable input ─────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    age: '',
    gender: '',
    phone: '',
    language: 'en',
  });

  const strength = getPasswordStrength(form.password);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear the error for this field as the user types
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function validate() {
    const errs = {};
    if (!form.full_name.trim())       errs.full_name        = 'Full name is required.';
    if (!form.email.trim())           errs.email            = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email  = 'Enter a valid email address.';
    if (!form.password)               errs.password         = 'Password is required.';
    else if (form.password.length < 8) errs.password        = 'Password must be at least 8 characters.';
    if (!form.confirm_password)       errs.confirm_password = 'Please confirm your password.';
    else if (form.password !== form.confirm_password) errs.confirm_password = 'Passwords do not match.';
    if (form.age && (isNaN(form.age) || form.age < 1 || form.age > 120)) errs.age = 'Enter a valid age.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        phone: form.phone || null,
        language: form.language,
      };

      const { data } = await api.post('/api/auth/register', payload);

      // Save JWT token
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      toast.success(`Welcome, ${data.user.full_name}! 🎉`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(msg);
      if (err.response?.status === 409) {
        setErrors({ email: 'An account with this email already exists.' });
      }
    } finally {
      setLoading(false);
    }
  }

  const inputClass = (field) =>
    `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-slate-200'
    }`;

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
            <Activity className="w-7 h-7 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-1">Create Account</h1>
        <p className="text-slate-500 text-center text-sm mb-7">Start your AI health journey</p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Full Name */}
          <Field label="Full Name *" error={errors.full_name}>
            <input
              name="full_name"
              type="text"
              autoComplete="name"
              placeholder="John Doe"
              value={form.full_name}
              onChange={handleChange}
              className={inputClass('full_name')}
            />
          </Field>

          {/* Email */}
          <Field label="Email Address *" error={errors.email}>
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              className={inputClass('email')}
            />
          </Field>

          {/* Password */}
          <Field label="Password *" error={errors.password}>
            <div className="relative">
              <input
                name="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={handleChange}
                className={inputClass('password') + ' pr-11'}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Strength bar */}
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1 h-1.5">
                  {[1,2,3,4].map(i => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-all duration-300 ${
                        i <= strength.score ? strength.color : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                {strength.label && (
                  <p className="text-xs text-slate-500 mt-1">Strength: <span className="font-medium">{strength.label}</span></p>
                )}
              </div>
            )}
          </Field>

          {/* Confirm Password */}
          <Field label="Confirm Password *" error={errors.confirm_password}>
            <div className="relative">
              <input
                name="confirm_password"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={form.confirm_password}
                onChange={handleChange}
                className={inputClass('confirm_password') + ' pr-11'}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {/* Match tick */}
              {form.confirm_password && form.password === form.confirm_password && (
                <CheckCircle className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
            </div>
          </Field>

          {/* Optional fields row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age (optional)" error={errors.age}>
              <input
                name="age"
                type="number"
                min="1" max="120"
                placeholder="25"
                value={form.age}
                onChange={handleChange}
                className={inputClass('age')}
              />
            </Field>
            <Field label="Gender (optional)">
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not">Prefer not to say</option>
              </select>
            </Field>
          </div>

          <Field label="Phone (optional)">
            <input
              name="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={handleChange}
              className={inputClass('phone')}
            />
          </Field>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
              : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
        </p>

        <p className="mt-4 text-center text-xs text-slate-400">
          🔒 Your health data is private and secure.
        </p>
      </div>
    </div>
  );
}

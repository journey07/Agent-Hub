import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import './LoginPage.css';

const REMEMBERED_USERNAME_KEY = 'remembered_username';
const REMEMBER_ME_KEY = 'remember_me_preference';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  // Load remembered username and preference on mount
  useEffect(() => {
    const rememberedUsername = localStorage.getItem(REMEMBERED_USERNAME_KEY);
    const rememberMePreference = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    
    if (rememberedUsername) {
      setUsername(rememberedUsername);
    }
    
    if (rememberMePreference) {
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login(username, password, rememberMe);
      if (result.success) {
        // Save username and preference if rememberMe is checked
        if (rememberMe) {
          localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
          localStorage.setItem(REMEMBER_ME_KEY, 'true');
        } else {
          // Clear saved username and preference if rememberMe is unchecked
          localStorage.removeItem(REMEMBERED_USERNAME_KEY);
          localStorage.removeItem(REMEMBER_ME_KEY);
        }
        
        navigate(from, { replace: true });
      } else {
        setError(result.error || '아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (err) {
      setError('서버와 연결할 수 없습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container animate-fade-in">
        <div className="login-card">
          {/* backdrop-filter를 위한 별도 레이어 */}
          <div className="login-card-backdrop"></div>
          {/* 콘텐츠 레이어 */}
          <div className="login-card-content">
            <div className="login-header">
              <h1>Supersquad's<br className="mobile-break" /> Agent Hub</h1>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="input-group">
              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkmark"></span>
                Remember me
              </label>
            </div>

            {error && (
              <div className="error-message animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="spinner"></span>
              ) : (
                `Enter`
              )}
            </button>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}

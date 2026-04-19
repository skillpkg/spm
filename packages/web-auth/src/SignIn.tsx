import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import {
  requestDeviceCode,
  pollToken,
  AuthPendingError,
  AuthExpiredError,
  type DeviceCodeResponse,
} from './api';

type SignInState = 'idle' | 'requesting' | 'waiting' | 'success' | 'expired' | 'error';

export interface SignInProps {
  title?: string;
  subtitle?: string;
  accentColor?: string;
}

export const SignIn = ({
  title = 'Sign in to SPM',
  subtitle = 'Publish, manage, and track your AI agent skills.',
  accentColor,
}: SignInProps) => {
  const [state, setState] = useState<SignInState>('idle');
  const [deviceData, setDeviceData] = useState<DeviceCodeResponse | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { signIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/dashboard';

  const accentStyle = accentColor
    ? { background: accentColor }
    : { background: 'var(--color-accent)' };
  const accentGradient = accentColor
    ? { background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}88 100%)` }
    : {
        background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dim) 100%)',
      };

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startFlow = async () => {
    cleanup();
    setState('requesting');
    setErrorMsg('');

    try {
      const data = await requestDeviceCode();
      setDeviceData(data);
      setSecondsLeft(data.expires_in);
      setState('waiting');

      // Auto-copy code to clipboard
      try { await navigator.clipboard.writeText(data.user_code); } catch { /* ignore */ }

      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            cleanup();
            setState('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      intervalRef.current = setInterval(
        async () => {
          try {
            const result = await pollToken(data.device_code);
            cleanup();
            setState('success');
            signIn(result.token, result.user);
            navigate(from, { replace: true });
          } catch (err) {
            if (err instanceof AuthPendingError) {
              return;
            }
            cleanup();
            if (err instanceof AuthExpiredError) {
              setState('expired');
            } else {
              setState('error');
              setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
            }
          }
        },
        (data.interval || 5) * 1000,
      );
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start sign in');
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: 420,
    margin: '80px auto',
    padding: '40px 36px',
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border-default)',
    borderRadius: 12,
    textAlign: 'center',
  };

  if (state === 'idle' || state === 'requesting') {
    return (
      <div style={cardStyle}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            ...accentGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--color-bg)',
            margin: '0 auto 20px',
          }}
        >
          S
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: '0 0 8px',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            color: 'var(--color-text-muted)',
            margin: '0 0 28px',
          }}
        >
          {subtitle}
        </p>
        <button
          onClick={startFlow}
          disabled={state === 'requesting'}
          style={{
            width: '100%',
            padding: '12px 20px',
            borderRadius: 8,
            border: 'none',
            ...accentStyle,
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 600,
            cursor: state === 'requesting' ? 'wait' : 'pointer',
            opacity: state === 'requesting' ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
          {state === 'requesting' ? 'Connecting...' : 'Continue with GitHub'}
        </button>
      </div>
    );
  }

  if (state === 'waiting' && deviceData) {
    return (
      <div style={cardStyle}>
        <h2
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: '0 0 8px',
          }}
        >
          Enter this code on GitHub
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--color-text-muted)',
            margin: '0 0 24px',
          }}
        >
          Copy the code below and enter it at GitHub to authorize SPM.
        </p>
        <div
          style={{
            position: 'relative',
            fontFamily: 'var(--font-mono)',
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: accentColor || 'var(--color-accent)',
            padding: '16px 0',
            background: 'rgba(16,185,129,0.06)',
            borderRadius: 8,
            border: '1px solid rgba(16,185,129,0.15)',
            marginBottom: 20,
            cursor: 'pointer',
          }}
          onClick={() => {
            navigator.clipboard.writeText(deviceData.user_code);
            const el = document.getElementById('spm-copy-hint');
            if (el) { el.textContent = 'Copied!'; setTimeout(() => { el.textContent = 'Click to copy'; }, 1500); }
          }}
        >
          {deviceData.user_code}
          <div
            id="spm-copy-hint"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: 'normal',
              color: 'var(--color-text-muted)',
              marginTop: 6,
            }}
          >
            Click to copy
          </div>
        </div>
        <a
          href={deviceData.verification_uri}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            borderRadius: 8,
            background: 'var(--color-bg-hover)',
            border: '1px solid var(--color-border-default)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
            marginBottom: 24,
          }}
        >
          Open GitHub &rarr;
        </a>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--color-text-muted)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: accentColor || 'var(--color-accent)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          Waiting for authorization... {formatTime(secondsLeft)}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      </div>
    );
  }

  if (state === 'expired') {
    return (
      <div style={cardStyle}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 28,
            marginBottom: 16,
            color: 'var(--color-yellow)',
          }}
        >
          &#x23F0;
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: '0 0 8px',
          }}
        >
          Code expired
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            color: 'var(--color-text-muted)',
            margin: '0 0 24px',
          }}
        >
          The authorization code has expired. Please try again.
        </p>
        <button
          onClick={startFlow}
          style={{
            padding: '10px 28px',
            borderRadius: 8,
            border: 'none',
            ...accentStyle,
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  // error state
  return (
    <div style={cardStyle}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 28,
          marginBottom: 16,
          color: 'var(--color-red)',
        }}
      >
        &#x2716;
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          margin: '0 0 8px',
        }}
      >
        Sign in failed
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          color: 'var(--color-text-muted)',
          margin: '0 0 24px',
        }}
      >
        {errorMsg || 'Something went wrong. Please try again.'}
      </p>
      <button
        onClick={startFlow}
        style={{
          padding: '10px 28px',
          borderRadius: 8,
          border: 'none',
          ...accentStyle,
          color: 'var(--color-bg)',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
};

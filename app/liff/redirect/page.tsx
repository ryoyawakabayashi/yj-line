'use client';

import { Suspense, useEffect, useState } from 'react';
import Script from 'next/script';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

declare global {
  interface Window {
    liff: {
      init: (config: { liffId: string }) => Promise<void>;
      isInClient: () => boolean;
      openWindow: (params: { url: string; external?: boolean }) => void;
      getProfile: () => Promise<{ userId: string; displayName: string; pictureUrl?: string }>;
      ready: Promise<void>;
    };
  }
}

type Status = 'loading' | 'redirecting' | 'fallback' | 'error';

function LiffRedirectContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // URLにUTMパラメータを付与
  const buildTargetUrl = (baseUrl: string): string => {
    try {
      const url = new URL(baseUrl);
      const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref'];
      for (const param of utmParams) {
        const value = searchParams.get(param);
        if (value && !url.searchParams.has(param)) {
          url.searchParams.set(param, value);
        }
      }
      return url.toString();
    } catch {
      return baseUrl;
    }
  };

  // URLバリデーション
  const validateUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  };

  // URLパラメータを取得（LIFF経由でも直接でも対応）
  const getUrlParam = (): string | null => {
    if (typeof window === 'undefined') return null;

    // 1. ハッシュから取得（LIFF経由の場合、クエリパラメータが消えるため）
    // URL形式: https://liff.line.me/xxx#url=encoded_url
    const hash = window.location.hash;
    if (hash) {
      // #url= の後ろを全部取得（エンコードされた?や&も含む）
      const urlStart = hash.indexOf('url=');
      if (urlStart !== -1) {
        const encodedUrl = hash.substring(urlStart + 4); // 'url=' の後ろ全部
        console.log('Hash found, encoded URL:', encodedUrl);
        return decodeURIComponent(encodedUrl);
      }
    }

    // 2. searchParamsから取得（通常のクエリパラメータ）
    const fromSearchParams = searchParams.get('url');
    if (fromSearchParams) {
      return decodeURIComponent(fromSearchParams);
    }

    // 3. window.location.hrefから直接パース（フォールバック）
    const fullUrl = window.location.href;
    const match = fullUrl.match(/[?&]url=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }

    return null;
  };

  // LIFF初期化と即座にリダイレクト
  const handleLiffLoad = async () => {
    const liffId = '2006973060-cAgpaZ0y';

    try {
      // まずLIFF初期化
      await window.liff.init({ liffId });
      console.log('LIFF init success, isInClient:', window.liff.isInClient());

      // ユーザーID取得（トラッキング用）
      let uid = '';
      try {
        const profile = await window.liff.getProfile();
        uid = profile.userId;
        console.log('LIFF getProfile success, userId:', uid.slice(0, 8) + '...');
      } catch (e) {
        console.warn('getProfile failed, continuing without uid:', e);
      }

      // URLパラメータを取得
      const urlParam = getUrlParam();
      console.log('URL param:', urlParam);

      if (!urlParam) {
        setStatus('error');
        setErrorMessage('リダイレクト先URLが指定されていません');
        return;
      }

      if (!validateUrl(urlParam)) {
        setStatus('error');
        setErrorMessage('無効なURLです');
        return;
      }

      // uidをリダイレクトURLに付与（/api/r/ 経由の場合）
      let finalUrl = buildTargetUrl(urlParam);
      if (uid && finalUrl.includes('/api/r/')) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl = `${finalUrl}${separator}uid=${uid}`;
      }

      setTargetUrl(finalUrl);
      setStatus('redirecting');

      if (window.liff.isInClient()) {
        // LINE内ブラウザ → 外部ブラウザで開く
        console.log('Opening external browser:', finalUrl);
        window.liff.openWindow({ url: finalUrl, external: true });
      } else {
        // LINE外 → 即座にリダイレクト
        console.log('Not in LINE, redirecting:', finalUrl);
        window.location.replace(finalUrl);
      }
    } catch (error) {
      console.error('LIFF error:', error);
      // エラー時はURLパラメータから直接リダイレクト試行
      const urlParam = getUrlParam();
      if (urlParam && validateUrl(urlParam)) {
        window.location.href = urlParam;
      } else {
        setStatus('error');
        setErrorMessage('初期化に失敗しました');
      }
    }
  };

  // 初回レンダリング時にURLをセット（フォールバック用）
  useEffect(() => {
    const urlParam = getUrlParam();
    if (urlParam && validateUrl(urlParam)) {
      setTargetUrl(buildTargetUrl(urlParam));
    }
  }, [searchParams]);

  // エラー表示
  if (status === 'error') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>!</div>
          <h1 style={styles.title}>エラー</h1>
          <p style={styles.message}>{errorMessage}</p>
        </div>
      </div>
    );
  }

  // フォールバック表示
  if (status === 'fallback' && targetUrl) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>外部ブラウザで開く</h1>
          <p style={styles.message}>
            下のボタンをタップしてください
          </p>
          <a href={targetUrl} style={styles.button} target="_blank" rel="noopener noreferrer">
            開く
          </a>
        </div>
      </div>
    );
  }

  // ローディング / リダイレクト中
  return (
    <div style={styles.container}>
      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        strategy="afterInteractive"
        onLoad={handleLiffLoad}
      />
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <Image
            src="/yolo-logo.png"
            alt="YOLO JAPAN"
            width={64}
            height={64}
            style={{ animation: 'spin 2.5s linear infinite' }}
          />
        </div>
        <p style={styles.loadingText}>
          {status === 'redirecting' ? '開いています...' : ''}
        </p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <Image
            src="/yolo-logo.png"
            alt="YOLO JAPAN"
            width={64}
            height={64}
            style={{ animation: 'spin 2.5s linear infinite' }}
          />
        </div>
      </div>
    </div>
  );
}

export default function LiffRedirectPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LiffRedirectContent />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    backgroundColor: 'transparent',
    padding: '40px 32px',
    textAlign: 'center',
    maxWidth: '320px',
    width: '100%',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 12px 0',
  },
  message: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 20px 0',
    lineHeight: '1.5',
  },
  loadingText: {
    fontSize: '13px',
    color: '#999',
    margin: '0',
    letterSpacing: '0.5px',
  },
  button: {
    display: 'inline-block',
    backgroundColor: '#111',
    color: '#ffffff',
    padding: '14px 48px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '500',
  },
  logoContainer: {
    width: '64px',
    height: '64px',
    margin: '0 auto 16px',
  },
  errorIcon: {
    width: '48px',
    height: '48px',
    backgroundColor: '#f5f5f5',
    color: '#cc0000',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 auto 16px',
    border: '1px solid #e0e0e0',
  },
};

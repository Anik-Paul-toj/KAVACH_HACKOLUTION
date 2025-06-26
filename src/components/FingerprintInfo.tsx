import React, { useState, useEffect } from 'react';
import ErrorIcon from '@mui/icons-material/Error';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface FingerprintData {
  visitorId: string;
  confidence?: {
    score: number;
  };
  timestamp?: number;
  lastSeen?: number; // Unix timestamp
  bot?: {
    probability: number;
    type: string;
  };
  components?: any; // Raw component data from FingerprintJS
}

interface FingerprintInfoProps {
  // No longer need API key for open source version
}

const FingerprintInfo: React.FC<FingerprintInfoProps> = () => {
  const [fpData, setFpData] = useState<FingerprintData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const loadFingerprint = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        throw new Error("Could not find active tab.");
      }

      const response = await chrome.runtime.sendMessage({
        action: 'runFingerprint',
        tabId: tab.id,
      });

      if (response.success) {
        setFpData(response.data);
      } else {
        // Handle specific CSP errors more gracefully
        let errorMessage = response.error || 'Unknown fingerprinting error';
        if (errorMessage.includes('Content Security Policy') || 
            errorMessage.includes('CSP') || 
            errorMessage.includes('fpnpmcdn.net')) {
          errorMessage = 'Fingerprinting temporarily blocked by browser security. This may happen on some websites with strict security policies.';
        }
        throw new Error(errorMessage);
      }
    } catch (e: any) {
      let errorMessage = e.message || String(e);
      // Simplify CSP error messages for users
      if (errorMessage.includes('Content Security Policy') || 
          errorMessage.includes('CSP') || 
          errorMessage.includes('fpnpmcdn.net') ||
          errorMessage.includes('script-src')) {
        errorMessage = 'Fingerprinting blocked by website security policy. Try refreshing or navigate to a different site.';
      }
      setError(errorMessage);
      setFpData(null);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadFingerprint();
  }, []);

  const getUniquenessLevel = (score?: number) => {
    if (!score) return { level: 'Unknown', color: '#6b7280', icon: '❓' };
    
    const percentage = score * 100;
    if (percentage >= 99) return { level: 'Highly Unique', color: '#dc2626', icon: '🚨' };
    if (percentage >= 95) return { level: 'Very Unique', color: '#ea580c', icon: '⚠️' };
    if (percentage >= 85) return { level: 'Unique', color: '#d97706', icon: '🔶' };
    if (percentage >= 70) return { level: 'Somewhat Unique', color: '#ca8a04', icon: '🟡' };
    return { level: 'Common', color: '#16a34a', icon: '✅' };
  };

  const uniqueness = getUniquenessLevel(fpData?.confidence?.score);

  return (
    <div className="section">
      <div className="section-header">
        <div className="section-title">
          🔍 Browser Fingerprint
        </div>
        <button 
          className="refresh-button"
          onClick={loadFingerprint}
          disabled={loading}
          title="Refresh fingerprint data"
        >
          {loading ? '⟳' : '↻'}
        </button>
      </div>

      {error ? (
        <div className="fingerprint-error">
          <div className="error-icon">
            <ErrorIcon sx={{ fontSize: 20, color: '#dc2626' }} />
          </div>
          <div className="error-content">
            <div className="error-title">Fingerprint Analysis Failed</div>
            <div className="error-message">{error}</div>
            <button onClick={loadFingerprint} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <div className="fingerprint-content">
          <div className="fingerprint-overview">
            <div className="fingerprint-metric">
              <div className="metric-label">Visitor ID</div>
              <div className="metric-value visitor-id">
                {loading ? (
                  <div className="loading-placeholder">Loading...</div>
                ) : (
                  fpData?.visitorId ? 
                    `${fpData.visitorId.substring(0, 8)}...` : 
                    'Not available'
                )}
              </div>
            </div>

            <div className="fingerprint-metric">
              <div className="metric-label">Uniqueness</div>
              <div className="metric-value uniqueness" style={{ color: uniqueness.color }}>
                {loading ? (
                  <div className="loading-placeholder">Loading...</div>
                ) : (
                  <>
                    <span className="uniqueness-icon">{uniqueness.icon}</span>
                    <span className="uniqueness-text">
                      {fpData?.confidence?.score ? 
                        `${(fpData.confidence.score * 100).toFixed(1)}% (${uniqueness.level})` : 
                        'Unknown'
                      }
                    </span>
                  </>
                )}
              </div>
            </div>

            {fpData && fpData.bot && (
              <div className="fingerprint-metric">
                <div className="metric-label">Visitor Type</div>
                <div className="metric-value" style={{ 
                  color: fpData.bot.type === 'unlikely' ? '#16a34a' : '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {fpData.bot.type === 'unlikely' ? (
                    <>
                      <PersonIcon sx={{ fontSize: 16 }} />
                      <span>Human ({(fpData.bot.probability * 100).toFixed(0)}% bot probability)</span>
                    </>
                  ) : (
                    <>
                      <SmartToyIcon sx={{ fontSize: 16 }} />
                      <span>Bot ({(fpData.bot.probability * 100).toFixed(0)}% bot probability)</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {fpData && fpData.lastSeen && (
              <div className="fingerprint-metric">
                <div className="metric-label">Last Seen</div>
                <div className="metric-value" style={{ fontSize: '12px', color: '#64748b' }}>
                  {new Date(fpData.lastSeen).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          {fpData && !loading && (
            <div className="fingerprint-details">
              <button 
                className="toggle-details"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? '▼' : '▶'} {showDetails ? 'Hide' : 'Show'} Details
              </button>
              
              {showDetails && (
                <div className="details-content">
                  {fpData.lastSeen && (
                    <div className="detail-item">
                      <span className="detail-label">Last Seen:</span>
                      <span className="detail-value">
                        {new Date(fpData.lastSeen).toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {fpData.timestamp && (
                    <div className="detail-item">
                      <span className="detail-label">Generated:</span>
                      <span className="detail-value">
                        {new Date(fpData.timestamp).toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {fpData.bot && (
                    <div className="detail-item">
                      <span className="detail-label">Bot Detection:</span>
                      <span className="detail-value" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        color: fpData.bot.type === 'unlikely' ? '#16a34a' : '#dc2626'
                      }}>
                        {fpData.bot.type === 'unlikely' ? (
                          <>
                            <CheckCircleIcon sx={{ fontSize: 14 }} />
                            <span>Human ({(fpData.bot.probability * 100).toFixed(1)}% bot probability)</span>
                          </>
                        ) : (
                          <>
                            <SmartToyIcon sx={{ fontSize: 14 }} />
                            <span>Bot Detected ({(fpData.bot.probability * 100).toFixed(1)}% probability)</span>
                          </>
                        )}
                      </span>
                    </div>
                  )}

                  <div className="detail-item">
                    <span className="detail-label">Full Visitor ID:</span>
                    <span className="detail-value visitor-id-full">
                      {fpData.visitorId}
                    </span>
                  </div>

                  <details className="raw-data">
                    <summary>Raw Data</summary>
                    <pre className="raw-data-content">
                      {JSON.stringify(fpData, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}

          <div className="fingerprint-info">
            <div className="info-text">
              Browser fingerprinting tracks you by analyzing unique characteristics of your device and browser. 
              Higher uniqueness scores indicate easier tracking.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FingerprintInfo;

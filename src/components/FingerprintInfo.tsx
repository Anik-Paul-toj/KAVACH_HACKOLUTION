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
  requestId?: string;
  lastSeenAt?: {
    global?: string;
    subscription?: string;
  };
  firstSeenAt?: {
    global?: string;
    subscription?: string;
  };
  bot?: {
    result: string;
  };
}

interface FingerprintInfoProps {
  apiKey: string;
}

const FingerprintInfo: React.FC<FingerprintInfoProps> = ({ apiKey }) => {
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
        apiKey,
        tabId: tab.id,
      });

      if (response.success) {
        setFpData(response.data);
      } else {
        throw new Error(response.error || 'Unknown fingerprinting error');
      }
    } catch (e: any) {
      setError(e.message || String(e));
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
                  color: fpData.bot.result === 'notDetected' ? '#16a34a' : '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {fpData.bot.result === 'notDetected' ? (
                    <>
                      <PersonIcon sx={{ fontSize: 16 }} />
                      <span>Human</span>
                    </>
                  ) : (
                    <>
                      <SmartToyIcon sx={{ fontSize: 16 }} />
                      <span>Bot</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {fpData && fpData.lastSeenAt && fpData.lastSeenAt.global && (
              <div className="fingerprint-metric">
                <div className="metric-label">Last Seen</div>
                <div className="metric-value" style={{ fontSize: '12px', color: '#64748b' }}>
                  {new Date(fpData.lastSeenAt.global).toLocaleDateString()}
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
                  {fpData.lastSeenAt && (
                    <div className="detail-item">
                      <span className="detail-label">Last Seen:</span>
                      <span className="detail-value">
                        {fpData.lastSeenAt.global ? 
                          new Date(fpData.lastSeenAt.global).toLocaleString() : 
                          'Unknown'}
                      </span>
                    </div>
                  )}
                  
                  {fpData.firstSeenAt && (
                    <div className="detail-item">
                      <span className="detail-label">First Seen:</span>
                      <span className="detail-value">
                        {fpData.firstSeenAt.global ? 
                          new Date(fpData.firstSeenAt.global).toLocaleString() : 
                          'Unknown'}
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
                        color: fpData.bot.result === 'notDetected' ? '#16a34a' : '#dc2626'
                      }}>
                        {fpData.bot.result === 'notDetected' ? (
                          <>
                            <CheckCircleIcon sx={{ fontSize: 14 }} />
                            <span>Human</span>
                          </>
                        ) : (
                          <>
                            <SmartToyIcon sx={{ fontSize: 14 }} />
                            <span>Bot Detected</span>
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

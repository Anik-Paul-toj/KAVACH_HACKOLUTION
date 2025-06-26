import React, { useState, useEffect } from 'react';
import ErrorIcon from '@mui/icons-material/Error';

interface FingerprintData {
  visitorId: string;
  confidence?: {
    score: number;
  };
  requestId?: string;
  incognito?: boolean;
  ip?: string;
  ipLocation?: {
    country?: string;
    city?: string;
  };
  browserDetails?: {
    browserName?: string;
    browserVersion?: string;
    os?: string;
    osVersion?: string;
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
                  {fpData.incognito !== undefined && (
                    <div className="detail-item">
                      <span className="detail-label">Incognito Mode:</span>
                      <span className="detail-value">
                        {fpData.incognito ? '🕵️ Yes' : '👤 No'}
                      </span>
                    </div>
                  )}
                  
                  {fpData.ip && (
                    <div className="detail-item">
                      <span className="detail-label">IP Address:</span>
                      <span className="detail-value">{fpData.ip}</span>
                    </div>
                  )}
                  
                  {fpData.ipLocation && (
                    <div className="detail-item">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">
                        {fpData.ipLocation.city && fpData.ipLocation.country 
                          ? `${fpData.ipLocation.city}, ${fpData.ipLocation.country}`
                          : fpData.ipLocation.country || 'Unknown'
                        }
                      </span>
                    </div>
                  )}
                  
                  {fpData.browserDetails && (
                    <>
                      {fpData.browserDetails.browserName && (
                        <div className="detail-item">
                          <span className="detail-label">Browser:</span>
                          <span className="detail-value">
                            {fpData.browserDetails.browserName} {fpData.browserDetails.browserVersion || ''}
                          </span>
                        </div>
                      )}
                      
                      {fpData.browserDetails.os && (
                        <div className="detail-item">
                          <span className="detail-label">Operating System:</span>
                          <span className="detail-value">
                            {fpData.browserDetails.os} {fpData.browserDetails.osVersion || ''}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {fpData.bot && (
                    <div className="detail-item">
                      <span className="detail-label">Bot Detection:</span>
                      <span className="detail-value">
                        {fpData.bot.result === 'notDetected' ? '✅ Human' : '🤖 Bot Detected'}
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

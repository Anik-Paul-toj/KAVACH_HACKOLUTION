import React from 'react';
import { TrackerData } from '../utils/types';

interface TrackerListProps {
  trackers: TrackerData[];
  onBlock?: () => void;
}

const TrackerList: React.FC<TrackerListProps> = ({ trackers, onBlock }) => {  if (trackers.length === 0) {
    return (
      <div className="empty-state" style={{ textAlign: 'center', padding: '32px' }}>
        <p style={{ fontSize: '16px', fontWeight: '600', color: '#64748b' }}>No trackers detected</p>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>This page appears to be clean!</p>
      </div>
    );
  }

  const getCategoryClass = (category: string) => {
    return `category-${category}`;
  };
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'advertising': return 'ADS';
      case 'analytics': return 'DATA';
      case 'social': return 'SOCIAL';
      default: return 'OTHER';
    }
  };

  const formatDomain = (domain: string) => {
    return domain.length > 24 ? domain.substring(0, 24) + '...' : domain;
  };

  const blockedCount = trackers.filter(t => t.blocked).length;
  const totalRequests = trackers.reduce((sum, t) => sum + t.count, 0);

  const handleBlockTracker = (domain: string) => {
    console.log(`Blocking tracker: ${domain}`);
    chrome.runtime.sendMessage({ action: 'blockTracker', domain }, (response) => {
      if (onBlock) onBlock();
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
      });
    });
  };

  const handleUnblockTracker = (domain: string) => {
    console.log(`Unblocking tracker: ${domain}`);
    chrome.runtime.sendMessage({ action: 'unblockTracker', domain }, (response) => {
      if (onBlock) onBlock();
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
      });
    });
  };

  return (
    <div>
      {/* Summary Stats */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '20px',
        padding: '16px',
        background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
        borderRadius: '12px',
        border: '1px solid #bae6fd'
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>
            {trackers.length}
          </div>
          <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: '600', textTransform: 'uppercase' }}>
            Trackers
          </div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>
            {blockedCount}
          </div>
          <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: '600', textTransform: 'uppercase' }}>
            Blocked
          </div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>
            {totalRequests}
          </div>
          <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: '600', textTransform: 'uppercase' }}>
            Requests
          </div>
        </div>
      </div>

      <div className="tracker-list">
        {trackers.map((tracker, index) => (
          <div key={index} className="tracker-item">            <div className="tracker-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '10px', 
                  fontWeight: '700',
                  background: '#007E36',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {getCategoryIcon(tracker.category)}
                </span>
                <span className={`tracker-category ${getCategoryClass(tracker.category)}`}>
                  {tracker.category}
                </span>
                {!tracker.blocked && (
                  <button
                    className="block-tracker-btn"
                    style={{ marginLeft: 8, padding: '2px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #dc2626', background: '#fff', color: '#dc2626', cursor: 'pointer' }}
                    onClick={() => handleBlockTracker(tracker.domain)}
                    title="Block this tracker"
                  >
                    Block
                  </button>
                )}
                {tracker.blocked && (
                  <>
                    <span className="blocked-indicator">Blocked</span>
                    <button
                      className="unblock-tracker-btn"
                      style={{ marginLeft: 8, padding: '2px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #007E36', background: '#fff', color: '#007E36', cursor: 'pointer' }}
                      onClick={() => handleUnblockTracker(tracker.domain)}
                      title="Unblock this tracker"
                    >
                      Unblock
                    </button>
                  </>
                )}
              </div>
              <div style={{ 
                fontSize: '15px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginTop: '4px'
              }}>
                {formatDomain(tracker.domain)}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="tracker-count">
                {tracker.count} req{tracker.count !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackerList;

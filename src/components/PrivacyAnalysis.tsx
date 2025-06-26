import React from 'react';
import { PrivacyPolicyAnalysis } from '../utils/types';

interface PrivacyAnalysisProps {
  analysis: PrivacyPolicyAnalysis;
}

const PrivacyAnalysis: React.FC<PrivacyAnalysisProps> = ({ analysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 30) return 'Poor';
    return 'Critical';
  };

  const getSafetyColor = (safety: string) => {
    switch (safety) {
      case 'SAFE': return '#10b981';
      case 'RISKY': return '#f59e0b';
      case 'UNSAFE': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getSafetyIcon = (safety: string) => {
    switch (safety) {
      case 'SAFE': return '🛡️';
      case 'RISKY': return '⚠️';
      case 'UNSAFE': return '🚨';
      default: return '❓';
    }
  };

  const getSafetyLabel = (safety: string) => {
    switch (safety) {
      case 'SAFE': return 'Safe Privacy Practices';
      case 'RISKY': return 'Risky Privacy Practices';
      case 'UNSAFE': return 'Unsafe Privacy Practices';
      default: return 'Unknown Safety Level';
    }
  };

  return (
    <div className="section">
      <div className="section-title">
        AI Privacy Policy Analysis
      </div>
      
      {/* Privacy Score Bar */}
      <div style={{ 
        background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', 
        padding: '20px', 
        borderRadius: '16px', 
        marginBottom: '20px',
        border: '2px solid #e2e8f0'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '12px' 
        }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>
            Privacy Score
          </span>
          <span style={{ 
            fontSize: '24px', 
            fontWeight: '800', 
            color: getScoreColor(analysis.score) 
          }}>
            {analysis.score}/100
          </span>
        </div>
        <div style={{ 
          width: '100%', 
          height: '12px', 
          background: '#e2e8f0', 
          borderRadius: '6px', 
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{ 
            width: `${analysis.score}%`, 
            height: '100%', 
            background: `linear-gradient(90deg, ${getScoreColor(analysis.score)}, ${getScoreColor(analysis.score)}dd)`,
            borderRadius: '6px',
            transition: 'width 1s ease-out',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'scoreShimmer 2s ease-in-out infinite'
            }} />
          </div>
        </div>
        <div style={{ 
          textAlign: 'center', 
          marginTop: '8px', 
          fontSize: '12px', 
          fontWeight: '600',
          color: getScoreColor(analysis.score),
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {getScoreLabel(analysis.score)} Privacy Protection
        </div>
      </div>
      
      {/* Safety Rating Badge */}
      {analysis.safety && (
        <div style={{ 
          background: `linear-gradient(135deg, ${getSafetyColor(analysis.safety)}15, ${getSafetyColor(analysis.safety)}25)`, 
          padding: '16px', 
          borderRadius: '12px', 
          marginBottom: '16px',
          border: `2px solid ${getSafetyColor(analysis.safety)}30`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ 
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            background: `${getSafetyColor(analysis.safety)}20`,
            borderRadius: '50%'
          }}>
            {getSafetyIcon(analysis.safety)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '700', 
              color: getSafetyColor(analysis.safety),
              marginBottom: '4px'
            }}>
              {analysis.safety}
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: '#64748b',
              fontWeight: '500'
            }}>
              {getSafetyLabel(analysis.safety)}
            </div>
          </div>
        </div>
      )}
      
      <div className="privacy-summary" style={{ 
        fontSize: '14px', 
        lineHeight: '1.6',
        background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid #bae6fd',
        marginBottom: '20px'
      }}>        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <strong style={{ color: '#0369a1', marginBottom: '8px', display: 'block' }}>
              AI Analysis Summary
            </strong>
            {analysis.summary}
          </div>
        </div>
      </div>

      {/* Industry Type & Analysis Depth */}
      {(analysis.industryType || analysis.analysisDepth) && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          {analysis.industryType && (
            <span style={{
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: '600',
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              borderRadius: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {analysis.industryType} Industry
            </span>
          )}
          {analysis.analysisDepth && (
            <span style={{
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: '600',
              backgroundColor: '#dcfce7',
              color: '#166534',
              borderRadius: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {analysis.analysisDepth}
            </span>
          )}
        </div>
      )}

      {analysis.risks.length > 0 && (
        <div className="privacy-risks" style={{ marginBottom: '20px' }}>          <strong style={{ 
            fontSize: '16px', 
            marginBottom: '16px', 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#dc2626'
          }}>
            Privacy Risks Detected
          </strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {analysis.risks.map((risk, index) => (
              <div key={index} className="risk-item" style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                borderRadius: '12px',
                border: '1px solid #fecaca',
                fontSize: '13px',
                lineHeight: '1.4'
              }}>
                <span style={{ 
                  color: '#dc2626', 
                  fontSize: '16px', 
                  flexShrink: 0,
                  marginTop: '2px'
                }}>•</span>
                <span style={{ color: '#7f1d1d', fontWeight: '500' }}>{risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.dataSharing.length > 0 && (
        <div>
          <strong style={{ 
            fontSize: '16px', 
            marginBottom: '16px', 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#7c2d12'
          }}>
            🔗 Data Sharing Partners
          </strong>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
            gap: '8px' 
          }}>
            {analysis.dataSharing.map((company, index) => (
              <span 
                key={index}
                style={{
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                  color: '#dc2626',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  textAlign: 'center',
                  border: '2px solid #fecaca',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px'
                }}
              >
                {company}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Positive Features */}
      {analysis.positiveFeatures && analysis.positiveFeatures.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <strong style={{ 
            fontSize: '14px', 
            color: '#166534', 
            display: 'block', 
            marginBottom: '12px',
            fontWeight: '700'
          }}>
            ✅ Positive Privacy Practices
          </strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {analysis.positiveFeatures.map((feature: string, index: number) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '8px 12px',
                background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                borderRadius: '12px',
                border: '1px solid #86efac',
                fontSize: '13px',
                lineHeight: '1.4'
              }}>
                <span style={{ 
                  color: '#059669', 
                  fontSize: '16px', 
                  flexShrink: 0,
                  marginTop: '2px'
                }}>✓</span>
                <span style={{ color: '#166534', fontWeight: '500' }}>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyAnalysis;

import React from 'react';
import { DataFlowNode, DataFlowEdge } from '../utils/types';

interface DataFlowVisualizationProps {
  dataFlow: {
    nodes: DataFlowNode[];
    edges: DataFlowEdge[];
  };
}

const DataFlowVisualization: React.FC<DataFlowVisualizationProps> = ({ dataFlow }) => {
  if (dataFlow.nodes.length === 0) {    return (
      <div className="data-flow">
        <div className="empty-state" style={{ 
          color: '#94a3b8', 
          textAlign: 'center', 
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <p style={{ fontSize: '16px', fontWeight: '600' }}>No data flow detected yet.</p>
          <p style={{ fontSize: '14px', marginTop: '8px', opacity: 0.8 }}>Visit a website to see data sharing patterns</p>
        </div>
      </div>
    );
  }

  const sourceNode = dataFlow.nodes.find(n => n.type === 'source');
  const trackerNodes = dataFlow.nodes.filter(n => n.type === 'tracker');

  const formatDomain = (domain: string) => {
    return domain.length > 14 ? domain.substring(0, 14) + '...' : domain;
  };

  const displayedTrackers = trackerNodes.slice(0, 3);
  const remainingCount = Math.max(0, trackerNodes.length - 3);

  return (
    <div className="data-flow">
      <div className="flow-container">
        {/* Source Node */}
        {sourceNode && (          <div className="flow-section source-section">
            <div className="flow-node source">
              <div className="node-label">SOURCE</div>
              <div className="node-domain">{formatDomain(sourceNode.domain)}</div>
            </div>
          </div>
        )}        {/* Arrow Connector */}
        {dataFlow.edges.length > 0 && sourceNode && displayedTrackers.length > 0 && (
          <div className="flow-section arrow-section">
            <div className="flow-arrow">
              <div className="arrow-line"></div>
              <div className="arrow-head">&gt;</div>
            </div>
          </div>
        )}

        {/* Tracker Nodes */}
        {displayedTrackers.length > 0 && (
          <div className="flow-section trackers-section">
            <div className="tracker-nodes">              {displayedTrackers.map((node, index) => (
                <div key={node.id} className="flow-node tracker">
                  <div className="node-label">TRACKER {index + 1}</div>
                  <div className="node-domain">{formatDomain(node.domain)}</div>
                </div>
              ))}{remainingCount > 0 && (                <div style={{
                  fontSize: '12px',
                  color: 'white',
                  textAlign: 'center',
                  fontStyle: 'italic',
                  marginTop: '12px',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  fontWeight: '700',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}>
                  +{remainingCount} more tracker{remainingCount > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        )}
      </div>      {/* Enhanced Data sharing warning */}
      {dataFlow.edges.length > 0 && (
        <div className="data-sharing-warning">
          <div className="warning-text">
            <strong>Privacy Alert:</strong> Your data is being shared with {dataFlow.edges.length} third-party domain{dataFlow.edges.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Data flow stats */}
      {dataFlow.edges.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '16px',
          padding: '12px 0',
          borderTop: '1px solid rgba(148, 163, 184, 0.3)'
        }}>          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>
              {trackerNodes.length}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
              Trackers
            </div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>
              {dataFlow.edges.length}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
              Connections
            </div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#007E36' }}>
              Real-time
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
              Monitoring
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataFlowVisualization;

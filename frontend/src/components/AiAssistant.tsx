import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface AiAssistantProps {
  initialDiagnosis?: {
    modelType: string;
    predictionData: any;
  } | null;
  onClose?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  sources?: string[];
  isDiagnosis?: boolean;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ initialDiagnosis, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! I am your Industrial Hybrid RAG AI Assistant. I can search both internal factory SOPs & real dataset manuals as well as live web search results.',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [machineId, setMachineId] = useState('');
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  // Auto-trigger diagnosis if passed initialDiagnosis prop
  useEffect(() => {
    if (initialDiagnosis) {
      handleRunDiagnosis(initialDiagnosis.modelType, initialDiagnosis.predictionData);
    }
  }, [initialDiagnosis]);

  const handleRunDiagnosis = async (modelType: string, predictionData: any) => {
    setLoading(true);
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: `[AI Diagnostic Request] Run Hybrid RAG failure diagnosis for ${modelType} model prediction alert.`,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.diagnoseRag(modelType, predictionData, enableWebSearch);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: res.diagnostic_summary || 'No diagnosis summary produced.',
        sources: res.sources || [],
        isDiagnosis: true,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: `Error performing RAG failure diagnosis: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setLoading(true);

    try {
      const res = await api.queryRag(textToSend, machineId || undefined, enableWebSearch);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: res.answer || 'No answer found.',
        sources: res.sources || [],
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: `Failed to retrieve RAG response: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleIngestKnowledge = async () => {
    setIngestStatus('Re-indexing vector knowledge base...');
    try {
      const res = await api.ingestRagKnowledge();
      setIngestStatus(res.message || 'Knowledge base successfully updated.');
      setTimeout(() => setIngestStatus(null), 4000);
    } catch (err: any) {
      setIngestStatus(`Re-indexing failed: ${err.message}`);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>🤖</span>
          <h3 style={{ margin: 0, color: '#fff' }}>Industrial Hybrid RAG Copilot</h3>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setEnableWebSearch(!enableWebSearch)}
            style={{
              ...styles.secondaryBtn,
              backgroundColor: enableWebSearch ? '#0284c7' : '#334155',
              border: enableWebSearch ? '1px solid #38bdf8' : '1px solid #475569',
            }}
            title="Toggle Live Web Search Fallback"
          >
            {enableWebSearch ? '🌐 Web Search ON' : '🔒 Local Only'}
          </button>
          <button onClick={handleIngestKnowledge} style={styles.secondaryBtn} title="Refresh Vector Index">
            🔄 Refresh Index
          </button>
          {onClose && (
            <button onClick={onClose} style={styles.closeBtn}>
              ✕
            </button>
          )}
        </div>
      </div>

      {ingestStatus && <div style={styles.banner}>{ingestStatus}</div>}

      <div style={styles.quickPrompts}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Quick Prompts:</span>
        <button
          style={styles.chip}
          onClick={() => handleSendMessage('What is SOP-101 for high machine vibration?')}
        >
          High Vibration SOP
        </button>
        <button
          style={styles.chip}
          onClick={() => handleSendMessage('How to troubleshoot SECOM wafer defect alert?')}
        >
          SECOM Defect Remediation
        </button>
        <button
          style={styles.chip}
          onClick={() => handleSendMessage('What are C-MAPSS sensor mappings for turbofan engines?')}
        >
          C-MAPSS Sensor Guide
        </button>
      </div>

      <div style={styles.chatArea}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.msgBubble,
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor: msg.sender === 'user' ? '#2563eb' : '#1e293b',
              border: msg.isDiagnosis ? '1px solid #f59e0b' : '1px solid #334155',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px', color: '#cbd5e1' }}>
              {msg.sender === 'user' ? 'You' : msg.isDiagnosis ? '⚠️ RAG Diagnostic Engine' : 'AI Assistant'}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{msg.text}</div>

            {msg.sources && msg.sources.length > 0 && (
              <div style={styles.sourcesContainer}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#38bdf8' }}>Retrieved Sources: </span>
                {msg.sources.map((src, idx) => (
                  <span key={idx} style={styles.sourceTag}>
                    📄 {src}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <div style={styles.loadingBubble}>Searching vector knowledge base & generating diagnosis...</div>}
      </div>

      <div style={styles.inputArea}>
        <input
          type="text"
          placeholder="Machine ID (optional e.g. CNC-400)"
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          style={styles.machineInput}
        />
        <input
          type="text"
          placeholder="Ask a technical or maintenance question..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          style={styles.queryInput}
        />
        <button onClick={() => handleSendMessage()} disabled={loading} style={styles.sendBtn}>
          Send
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: '700px',
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #334155',
    color: '#f8fafc',
    overflow: 'hidden',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  secondaryBtn: {
    backgroundColor: '#334155',
    color: '#f1f5f9',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  closeBtn: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
  },
  banner: {
    backgroundColor: '#0284c7',
    color: '#fff',
    padding: '6px 12px',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  quickPrompts: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#182238',
    overflowX: 'auto',
    borderBottom: '1px solid #334155',
  },
  chip: {
    backgroundColor: '#1e293b',
    color: '#38bdf8',
    border: '1px solid #0284c7',
    borderRadius: '16px',
    padding: '4px 10px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  chatArea: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  msgBubble: {
    maxWidth: '85%',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '0.9rem',
  },
  sourcesContainer: {
    marginTop: '8px',
    paddingTop: '6px',
    borderTop: '1px dashed #475569',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  },
  sourceTag: {
    backgroundColor: '#0f172a',
    color: '#94a3b8',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
  },
  loadingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    padding: '10px 14px',
    borderRadius: '10px',
    fontStyle: 'italic',
    fontSize: '0.85rem',
  },
  inputArea: {
    display: 'flex',
    gap: '8px',
    padding: '14px',
    backgroundColor: '#1e293b',
    borderTop: '1px solid #334155',
  },
  machineInput: {
    width: '140px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    color: '#fff',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '0.85rem',
  },
  queryInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    color: '#fff',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '0.85rem',
  },
  sendBtn: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 18px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

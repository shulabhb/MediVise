import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoggedInNavbar from '../components/LoggedInNavbar';
import logo2 from '../assets/MediVise2.png';
import { medicalAI } from '../services/medicalAI';

// Idempotency helpers to prevent duplicate conversation creation in React StrictMode
function beginOnce(key: string, ttlMs = 8000): boolean {
  // returns true if we just acquired the lock; false if already locked recently
  const now = Date.now();
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const { t } = JSON.parse(raw);
      if (now - t < ttlMs) return false; // already in progress recently
    }
    sessionStorage.setItem(key, JSON.stringify({ t: now }));
    return true;
  } catch {
    // if sessionStorage unavailable, fallback to allow
    return true;
  }
}

function endOnce(key: string) {
  try { sessionStorage.removeItem(key); } catch {}
}

// simple uuid-ish for idempotency header
function makeNonce() {
  return (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

function toDate(value: any): Date {
  return value instanceof Date ? value : new Date(value);
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  document?: {
    name: string;
    type: string;
    url?: string;
  };
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: Message[];
  starred?: boolean;
}

export default function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'starred'>('all');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [userDocuments, setUserDocuments] = useState<Array<{id: string, filename: string, summary?: string}>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea when content changes
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [newMessage]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [, setHasProcessedUrl] = useState(false);
  const location = useLocation();

  const BASE_URL = 'http://127.0.0.1:8000';

  async function fetchWithAuth(path: string, init?: RequestInit & { idempotencyKey?: string }) {
    try {
      const token = await user?.getIdToken();
      const headers: Record<string, string> = {
        ...(init?.headers as Record<string, string> | undefined),
        'Authorization': token ? `Bearer ${token}` : '',
      };
      if (init?.body && !(init?.headers as any)?.['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      if (init?.idempotencyKey) {
        headers['Idempotency-Key'] = init.idempotencyKey;
      }
      const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
      if (!res.ok) {
        console.error(`API ${path} failed: ${res.status}`, await res.text());
        throw new Error(`API ${path} failed: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.error(`Network error for ${path}:`, error);
      // Return a mock response for testing
      if (path === '/chat/conversations' && init?.method === 'POST') {
        return { id: `mock-${Date.now()}`, title: 'New conversation', created_at: new Date().toISOString() };
      }
      if (path === '/chat/message' && init?.method === 'POST') {
        return { conversation: { id: 'mock', messages: [] } };
      }
      throw error;
    }
  }

  // Initialize from backend and migrate localStorage if needed
  useEffect(() => {
    async function init() {
      if (!user || isCreatingNew) return;
      
      // Load user documents for context
      try {
        const token = await user?.getIdToken();
        if (token) {
          const docs = await medicalAI.getUserDocuments(token);
          setUserDocuments(docs);
        }
      } catch (error) {
        console.error('Failed to load user documents:', error);
      }
      try {
        let convs: any[] = await fetchWithAuth('/chat/conversations');
        const hasServer = Array.isArray(convs) && convs.length > 0;
        const local = localStorage.getItem('chat_conversations');
        const migrated = localStorage.getItem('chat_migrated') === '1';
        if (!hasServer && local && !migrated) {
          try {
            const localConvs: any[] = JSON.parse(local);
            for (const c of localConvs) {
              const created = await fetchWithAuth('/chat/conversations', { method: 'POST' });
              const convId = created.id;
              for (const m of c.messages || []) {
                await fetchWithAuth('/chat/message', {
                  method: 'POST',
                  body: JSON.stringify({
                    conversationId: convId,
                    message: m.text,
                    document: m.document ? { filename: m.document.name, content: '', documentType: m.document.type } : undefined,
                  })
                });
              }
            }
            localStorage.setItem('chat_migrated', '1');
          } catch (e) {
            console.warn('Local chat migration failed:', e);
          }
          convs = await fetchWithAuth('/chat/conversations');
        }
        // Deduplicate conversations by ID
        const uniqueConvs = (convs as any).reduce((acc: any[], conv: any) => {
          if (!acc.find(c => c.id === conv.id)) {
            acc.push(conv);
          }
          return acc;
        }, []);
        setConversations(uniqueConvs);
        const currentId = sessionStorage.getItem('current_chat_id');
        if (currentId && (convs as any).find((c: any) => c.id === currentId)) {
          setSelectedConversation(currentId);
        } else if ((convs as any).length > 0) {
          setSelectedConversation((convs as any)[0].id);
          sessionStorage.setItem('current_chat_id', (convs as any)[0].id);
        } else {
          // Only create new conversation if not already creating one via URL params
          const params = new URLSearchParams(location.search);
          const createNew = params.get('new') === '1';
          if (!createNew) {
            await createNewConversation();
          }
        }
      } catch (e) {
        console.error('Failed to initialize conversations:', e);
      }
    }
    init();
  }, [user, isCreatingNew]);

  // If navigated with ?new=1, create a fresh conversation and attach a document if provided
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const createNew = params.get('new') === '1';
    const docId = params.get('docId');

    if (!createNew || isCreatingNew) return;

    // EARLY: remove params so StrictMode second mount won't see ?new=1
    const url = new URL(window.location.href);
    url.searchParams.delete('new');
    if (docId) url.searchParams.delete('docId');
    window.history.replaceState({}, '', url.toString());

    // lock
    const LOCK = 'creating_new_chat_lock';
    if (!beginOnce(LOCK)) return;

    setHasProcessedUrl(true);
    setIsCreatingNew(true);

    (async () => {
      try {
        await createNewConversation();
        if (docId) {
          try {
            const doc = await fetchWithAuth(`/documents/${docId}`);
            const docInfo = {
              id: docId,
              name: doc?.filename || `Document ${docId}`,
              type: 'application/pdf',
              url: `${BASE_URL}/documents/${docId}/file`,
            };
            setNewMessage('Ask about this document...');
            sessionStorage.setItem('chat_attached_doc', JSON.stringify(docInfo));
          } catch (e) {
            console.warn('Failed to load document for chat attach:', e);
            setNewMessage('Ask about this document...');
          }
        }
      } finally {
        setIsCreatingNew(false);
        endOnce(LOCK);
      }
    })();
  }, [location.search, isCreatingNew]);

  // Close any open conversation menu when conversations change or selected changes
  useEffect(() => {
    if (!openMenuId) return;
    const exists = conversations.some((c) => c.id === openMenuId);
    if (!exists) setOpenMenuId(null);
  }, [conversations, openMenuId, selectedConversation]);

  // Close menu on outside click or Escape key
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.conv-menu') && !target.closest('.conv-more')) {
        setOpenMenuId(null);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenMenuId(null);
    }
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // remove local-only loader (replaced by server init)

  // Load messages for selected conversation from backend
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }
    (async () => {
      try {
        const data = await fetchWithAuth(`/chat/conversations/${selectedConversation}`);
        setMessages((data?.messages || []) as any);
      } catch (e) {
        console.error('Failed to load conversation:', e);
      }
    })();
  }, [selectedConversation]);

  // Auto-scroll to bottom of messages (also when typing indicator shows)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, selectedConversation]);

  const createNewConversation = async () => {
    const LOCK = 'creating_new_chat_lock';
    const nonce = makeNonce();

    if (!beginOnce(LOCK)) {
      // Someone else (second mount) is already creating a chat; just bail
      return;
    }

    try {
      const created = await fetchWithAuth('/chat/conversations', {
        method: 'POST',
        idempotencyKey: nonce,
      });

      setConversations((prev) => {
        if (prev.find(c => c.id === created.id)) return prev; // de-dupe
        return [created as any, ...prev];
      });
      setSelectedConversation(created.id);
      sessionStorage.setItem('current_chat_id', created.id);
      
      // Add a welcome message from the AI
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        text: `Hello! I'm MediVise, your medical AI assistant. I'm here to help you understand your medical information, medications, and health questions. 

I can:
• Explain medical documents in plain language
• Help you understand your medications and their purposes
• Answer questions about your health conditions
• Prepare you for doctor appointments
• Provide insights from your uploaded medical records

How can I assist you today? Feel free to ask me anything about your health or upload a medical document for analysis.`,
        sender: 'assistant',
        timestamp: new Date(),
      };

      // Add the welcome message to the conversation
      await fetchWithAuth('/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: created.id,
          conversation_id: created.id,
          message: welcomeMessage.text,
          sender: welcomeMessage.sender,
          suppressAssistant: true,
        })
      });

      // Refresh the conversation to show the welcome message
      const updatedConv = await fetchWithAuth(`/chat/conversations/${created.id}`);
      setMessages(updatedConv.messages || []);
    } catch (e) {
      console.error('Failed to create conversation:', e);
    } finally {
      endOnce(LOCK);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const token = await user?.getIdToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BASE_URL}/api/ocr/ingest?lang=eng`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
        body: form,
      });
      if (!res.ok) {
        let detail = '';
        try {
          const err = await res.json();
          detail = err?.detail || '';
        } catch {}
        throw new Error(`OCR failed: ${res.status}${detail ? ' - ' + detail : ''}`);
      }
      const data = await res.json();
      if (!data?.full_text) {
        throw new Error(data?.error || 'No text extracted');
      }

      // Save to Documents service as well
      const docForm = new FormData();
      docForm.append('file', file);
      const docRes = await fetch(`${BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${await user?.getIdToken()}` },
        body: docForm,
      });
      if (!docRes.ok) {
        console.warn('Document save failed:', docRes.status);
      }
      const docJson = await docRes.json().catch(() => null as any);
      const savedDoc = (docJson && (docJson as any).document) || null;

      const userDocMsg: Message = {
        id: `${Date.now()}-u`,
        text: `Uploaded document: ${file.name}`,
        sender: 'user',
        timestamp: new Date(),
        document: savedDoc ? { name: savedDoc.filename, type: savedDoc.documentType, url: `${BASE_URL}/documents/${savedDoc.id}/file` } : { name: file.name, type: file.type }
      };
      await addMessageToConversation(userDocMsg, { suppressAssistant: true });

      const ocrMsg: Message = {
        id: `${Date.now()}-a`,
        text: data.full_text,
        sender: 'assistant',
        timestamp: new Date()
      };
      await addMessageToConversation(ocrMsg, { suppressAssistant: true });
    } catch (e) {
      console.error('OCR upload failed:', e);
      alert('Failed to process document. Please try again.');
    } finally {
      setShowDocumentUpload(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const addMessageToConversation = async (message: Message, opts?: { suppressAssistant?: boolean }) => {
    if (!selectedConversation) return;
    try {
      // First, add the user message
      const resp = await fetchWithAuth('/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: selectedConversation,
          conversation_id: selectedConversation,
          message: message.text,
          document: message.document ? { filename: message.document.name, content: '', documentType: message.document.type } : undefined,
          sender: message.sender,
          suppressAssistant: true, // We'll handle the assistant response separately
        })
      });
      const updated = resp.conversation as any;
      setMessages(updated.messages || []);
      setConversations((prev) => {
        const others = prev.filter((c) => c.id !== updated.id);
        return [updated, ...others];
      });

      // If this is a user message and we should get an AI response
      if (message.sender === 'user' && !opts?.suppressAssistant) {
        try {
          // Build conversation history for context
          const conversationHistory = messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          }));
          
          // Get enhanced medical AI response with context
          const token = await user?.getIdToken();
          if (token) {
            const aiResponse = await medicalAI.getMedicalChatResponse(
              message.text,
              token,
              undefined, // contextDocument - will be handled by backend
              conversationHistory,
              userDocuments
            );
            
            // Add the AI response
            const aiMessage: Message = {
              id: `ai-${Date.now()}`,
              text: aiResponse,
              sender: 'assistant',
              timestamp: new Date(),
            };

            await fetchWithAuth('/chat/message', {
              method: 'POST',
              body: JSON.stringify({
                conversationId: selectedConversation,
                conversation_id: selectedConversation,
                message: aiMessage.text,
                sender: aiMessage.sender,
                suppressAssistant: true,
              })
            });

            // Refresh the conversation to get updated messages
            const updatedResp = await fetchWithAuth(`/chat/conversations/${selectedConversation}`);
            const updatedConv = updatedResp as any;
            setMessages(updatedConv.messages || []);
            setConversations((prev) => {
              const others = prev.filter((c) => c.id !== updatedConv.id);
              return [updatedConv, ...others];
            });
          }
        } catch (aiError) {
          console.error('Failed to get AI response:', aiError);
          // Add a fallback response
          const fallbackMessage: Message = {
            id: `fallback-${Date.now()}`,
            text: "I apologize, but I'm having trouble processing your request right now. Please try again or upload a medical document for more specific assistance.",
            sender: 'assistant',
            timestamp: new Date(),
          };

          await fetchWithAuth('/chat/message', {
            method: 'POST',
            body: JSON.stringify({
              conversationId: selectedConversation,
              conversation_id: selectedConversation,
              message: fallbackMessage.text,
              sender: fallbackMessage.sender,
              suppressAssistant: true,
            })
          });

          // Refresh the conversation
          const updatedResp = await fetchWithAuth(`/chat/conversations/${selectedConversation}`);
          const updatedConv = updatedResp as any;
          setMessages(updatedConv.messages || []);
          setConversations((prev) => {
            const others = prev.filter((c) => c.id !== updatedConv.id);
            return [updatedConv, ...others];
          });
        }
      }
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isLoading) return;

    // Store the message text before clearing the input
    const messageText = newMessage.trim();
    
    // Clear the input immediately for better UX
    setNewMessage('');
    
    // Set loading state
    setIsLoading(true);

    try {
      // attach document from session if present on the first send
      let attachedDoc: Message['document'] | undefined;
      const raw = sessionStorage.getItem('chat_attached_doc');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          attachedDoc = { name: parsed.name, type: parsed.type, url: parsed.url };
        } catch {}
        sessionStorage.removeItem('chat_attached_doc');
      }

      const message: Message = {
        id: Date.now().toString(),
        text: messageText,
        sender: 'user',
        timestamp: new Date(),
        document: attachedDoc,
      };

      await addMessageToConversation(message);
      // Backend immediately returns assistant message; no simulated delay
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore the message if sending failed
      setNewMessage(messageText);
    } finally {
      setIsLoading(false);
    }
  };

  // Derived state for cleaner rendering
  const currentConversation = conversations.find(c => c.id === selectedConversation) || null;
  const filteredConversations = (() => {
    const list = [...conversations];
    let out = list;
    if (activeTab === 'starred') {
      out = list.filter((c: any) => Boolean(c.starred));
    }
    return out.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  })();

  return (
    <div className="chat-page">
      <Link to="/about">
        <img src={logo2} alt="MediVise" className="nav-logo-small" />
      </Link>
      <LoggedInNavbar />

      <div className="chat-container">
        {/* Chat History Sidebar */}
        <div className="chat-sidebar">
          <div className="sidebar-header">
            <h3>Chats</h3>
          </div>

          <div className="sidebar-tabs">
            <button className={`sidebar-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All</button>
            <button className={`sidebar-tab ${activeTab === 'starred' ? 'active' : ''}`} onClick={() => setActiveTab('starred')}>Starred</button>
            <button className="sidebar-plus" title="New Chat" onClick={createNewConversation}>+</button>
          </div>

          <div className="conversations-list">
            {filteredConversations
              .map((conversation) => (
                <div
                  key={`conv-${conversation.id}`}
                  className={`conversation-item ${selectedConversation === conversation.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedConversation(conversation.id);
                    sessionStorage.setItem('current_chat_id', conversation.id);
                  }}
                >
                  <div className="conversation-row">
                    <div className="conversation-title">
                      {conversation.title}
                      {conversation.starred ? ' ⭐' : ''}
                    </div>
                    <button
                      className="conv-more"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === conversation.id ? null : conversation.id);
                      }}
                      aria-label="More options"
                    >⋯</button>
                    {openMenuId === conversation.id && (
                      <div className="conv-menu" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="conv-menu-item"
                          onClick={() => {
                            const newTitle = window.prompt('Rename conversation', conversation.title || 'Conversation');
                            if (!newTitle) { setOpenMenuId(null); return; }
                            fetchWithAuth(`/chat/conversations/${conversation.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ title: newTitle })
                            }).then(() => {
                              setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, title: newTitle, timestamp: new Date() as any } : c));
                              setOpenMenuId(null);
                            }).catch(console.error);
                          }}
                        >Rename</button>
                        <button
                          className="conv-menu-item"
                          onClick={() => {
                            fetchWithAuth(`/chat/conversations/${conversation.id}`, { method: 'DELETE' })
                              .then(() => {
                                setConversations(prev => prev.filter(c => c.id !== conversation.id));
                                if (selectedConversation === conversation.id) {
                                  setSelectedConversation(null);
                                  sessionStorage.removeItem('current_chat_id');
                                }
                                setOpenMenuId(null);
                              })
                              .catch(console.error);
                          }}
                        >Delete</button>
                        <button
                          className="conv-menu-item"
                          onClick={() => {
                            fetchWithAuth(`/chat/conversations/${conversation.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ starred: !conversation.starred })
                            }).then(() => {
                              setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, starred: !conversation.starred, timestamp: new Date() as any } : c));
                              setOpenMenuId(null);
                            }).catch(console.error);
                          }}
                        >{conversation.starred ? 'Unstar' : 'Star'}</button>
                        <button
                          className="conv-menu-item"
                          onClick={() => {
                            setSelectedConversation(conversation.id);
                            sessionStorage.setItem('current_chat_id', conversation.id);
                            setOpenMenuId(null);
                          }}
                        >Open</button>
                      </div>
                    )}
                  </div>
                  {/* Minimal list: title only */}
                </div>
              ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="chat-main">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-title-area">
                  <div className="chat-title">
                    {currentConversation?.title || 'Conversation'}
                  </div>
                  <div className="chat-subtitle">
                    Updated {toDate(currentConversation?.timestamp || new Date()).toLocaleString()}
                  </div>
                </div>
                {/* header actions removed; use per-conversation menu */}
              </div>

              {/* Messages */}
              <div className={`messages-container ${messages.length === 0 ? 'empty' : ''}`}>
                {/* Gemini-like intro panel when no messages */}
                {messages.length === 0 && (
                  <div className="intro-panel">
                    <div className="intro-logo">✨</div>
                    <div className="intro-title">How can I help today?</div>
                    <div className="intro-subtitle">Ask about your medical documents, medications, or general health.</div>
                    
                    {/* Show available documents for context */}
                    {userDocuments.length > 0 && (
                      <div style={{ 
                        marginTop: '20px', 
                        padding: '16px', 
                        backgroundColor: '#f8fafc', 
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#374151', 
                          marginBottom: '8px' 
                        }}>
                          📄 Your Medical Documents ({userDocuments.length})
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                          I can help you understand these documents:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {userDocuments.slice(0, 3).map((doc) => (
                            <span key={doc.id} style={{
                              padding: '4px 8px',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              borderRadius: '4px',
                              fontSize: '11px',
                              border: '1px solid #bae6fd'
                            }}>
                              {doc.filename}
                            </span>
                          ))}
                          {userDocuments.length > 3 && (
                            <span style={{
                              padding: '4px 8px',
                              backgroundColor: '#f3f4f6',
                              color: '#6b7280',
                              borderRadius: '4px',
                              fontSize: '11px'
                            }}>
                              +{userDocuments.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="suggestion-chips">
                      {[
                        'Hi! Can you help me understand my medical information?',
                        'What medications am I taking and why?',
                        'Can you explain my recent test results?',
                        'What should I ask my doctor at my next appointment?',
                        'Help me understand my treatment plan',
                        'Are there any side effects I should watch for?',
                      ].map((s) => (
                        <button
                          key={s}
                          className="chip"
                          onClick={() => {
                            setNewMessage(s);
                            // send quickly
                            setTimeout(() => handleSendMessage(), 0);
                          }}
                        >{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((message, idx) => (
                  <div
                    key={`${message.id || 'msg'}-${idx}`}
                    className={`message ${message.sender}`}
                  >
                    <div className="message-meta">
                      {message.sender === 'user' ? 'You' : 'MediVise'}
                    </div>
                    <div className="message-content">
                      {message.document && (
                        <div className="message-document">
                          <div className="document-icon">📄</div>
                          <div className="document-info">
                            <div className="document-name">
                              {message.document.name}
                            </div>
                            <div className="document-type">
                              {message.document.type}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="message-text">{message.text}</div>
                      <div className="message-time">
                        {toDate(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="message assistant">
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="message-input-container">
                <div className="input-area">
                  <button
                    className="document-upload-btn"
                    onClick={() => setShowDocumentUpload(!showDocumentUpload)}
                    title="Upload Document"
                  >
                    📎
                  </button>

                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    onKeyDown={(e) => {
                      // Handle Enter key properly
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={1}
                    style={{
                      resize: 'none',
                      minHeight: '40px',
                      maxHeight: '120px',
                      overflow: 'auto'
                    }}
                  />

                  <button
                    className="send-btn"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isLoading}
                    style={{
                      opacity: (!newMessage.trim() || isLoading) ? 0.5 : 1,
                      cursor: (!newMessage.trim() || isLoading) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isLoading ? 'Sending...' : 'Send'}
                  </button>
                </div>

                {/* Document Upload Area */}
                {showDocumentUpload && (
                  <div className="document-upload-area">
                    <div
                      className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="upload-icon">📄</div>
                      <div className="upload-text">
                        Drag & drop a PDF here or click to browse
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        style={{ display: 'none' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-conversation">
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h3>Start a New Conversation</h3>
                <p>Select "New Chat" to begin chatting with AI assistance</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



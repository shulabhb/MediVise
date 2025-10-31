import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoggedInNavbar from '../components/LoggedInNavbar';
import logo2 from '../assets/MediVise2.png';
import { medicalAI } from '../services/medicalAI';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

function formatTimestamp(d: Date): string {
  try {
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const datePart = isToday ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' ';
    const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return datePart + timePart;
  } catch {
    return d.toLocaleString();
  }
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
  citations?: string[]; // Citations from AI responses
  contextUsed?: boolean; // Whether document context was used
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
  const [contextInfo, setContextInfo] = useState<{docsUsed: number, snippetsUsed: number} | null>(null);
  const [attachedDoc, setAttachedDoc] = useState<{ id: string; name: string; type: string; url: string } | null>(null);
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
  const creatingRef = useRef(false);
  const [, setHasProcessedUrl] = useState(false);
  const location = useLocation();

  const BASE_URL = (import.meta as any).env?.VITE_API_BASE ?? 'http://127.0.0.1:8000';

  // Linkify inline citations like: "doc:14 L294-1196 (p2:L100-L130)"
  function linkifyCitations(text: string): string {
    if (!text) return text;
    try {
      // doc:ID optional L-range optional (pX:Lstart-Lend)
      const re = /doc:(\d+)(?:\s+L\d+-\d+)?(?:\s*\((p\d+:L\d+-\d+)\))?/g;
      return text.replace(re, (_m, id: string, pagePart?: string) => {
        const doc = userDocuments.find(d => String(d.id) === String(id));
        const name = doc?.filename || `Document ${id}`;
        const pageBadge = pagePart ? ` · ${pagePart.split(':')[0]}` : '';
        // Markdown link to Documents viewer route
        return `[${name}${pageBadge}](/documents/view/${id})`;
      });
    } catch {
      return text;
    }
  }

  function renderCitationLink(citation: string): any {
    const match = citation.match(/doc:(\d+)[^)]*/);
    const id = match ? match[1] : '';
    const doc = userDocuments.find(d => String(d.id) === String(id));
    const name = doc?.filename || (id ? `Document ${id}` : citation);
    const href = id ? `/documents/view/${id}` : undefined;
    return (
      <a className="markdown-link" href={href} target="_self" rel="noreferrer">
        {name}
      </a>
    );
  }

  async function fetchWithAuth(path: string, init?: RequestInit & { idempotencyKey?: string }) {
    const doFetch = async (forceRefresh = false) => {
      const token = await user?.getIdToken(forceRefresh);
      const headers: Record<string, string> = {
        ...(init?.headers as Record<string, string> | undefined),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };
      if (init?.body && !(init?.headers as any)?.['Content-Type']) headers['Content-Type'] = 'application/json';
      if (init?.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey;
      const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
      return res;
    };

    // First attempt
    let res = await doFetch(false);
    if (res.status === 401 && user) {
      // Retry once with a forced token refresh
      res = await doFetch(true);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`API ${path} failed: ${res.status}`, body);
      throw new Error(`API ${path} failed: ${res.status}${body ? ' - ' + body : ''}`);
    }
    const json = await res.json().catch(() => ({}));
    return json;
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
        // Normalize timestamps to avoid UI breakage if backend omits 'timestamp'
        convs = (convs || []).map((c: any) => ({
          ...c,
          timestamp: c?.timestamp || c?.updated_at || c?.created_at || new Date().toISOString(),
          title: c?.title || 'Conversation',
        }));
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
          // Do NOT auto-create here; creation is handled only via ?new=1 or explicit New Chat button
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

    if (!createNew || isCreatingNew || creatingRef.current) return;

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
    creatingRef.current = true;

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
            setAttachedDoc(docInfo);
          } catch (e) {
            console.warn('Failed to load document for chat attach:', e);
            setNewMessage('Ask about this document...');
          }
        }
      } finally {
        setIsCreatingNew(false);
        creatingRef.current = false;
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
    if (creatingRef.current) return;
    creatingRef.current = true;
    setIsCreatingNew(true);
    const nonce = makeNonce();

    try {
      const created = await fetchWithAuth('/chat/conversations', {
        method: 'POST',
        idempotencyKey: nonce,
      });

      setConversations((prev) => {
        if (prev.find(c => c.id === created.id)) return prev; // de-dupe
        const normalized = {
          ...(created as any),
          timestamp: (created as any)?.updated_at || (created as any)?.created_at || new Date().toISOString(),
          title: (created as any)?.title || 'Conversation',
        };
        return [normalized, ...prev];
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
      const msg = e instanceof Error ? e.message : 'Failed to create conversation';
      alert(`New chat failed: ${msg}`);
    } finally {
      setIsCreatingNew(false);
      creatingRef.current = false;
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const token = await user?.getIdToken();
      
      // Save to Documents service - this handles both storage and text extraction
      const docForm = new FormData();
      docForm.append('file', file);
      const docRes = await fetch(`${BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: docForm,
      });
      
      if (!docRes.ok) {
        let errorDetail = '';
        try {
          const err = await docRes.json();
          errorDetail = err?.detail || '';
        } catch {}
        throw new Error(`Document upload failed: ${docRes.status}${errorDetail ? ' - ' + errorDetail : ''}`);
      }
      
      const docJson = await docRes.json();
      const savedDoc = (docJson && docJson.document) || null;

      if (!savedDoc) {
        throw new Error('Document upload succeeded but no document data returned');
      }

      // Refresh user documents list to include the new upload
      if (token) {
        const updatedDocs = await medicalAI.getUserDocuments(token);
        setUserDocuments(updatedDocs);
      }

      // Cache attached doc for the next send only (no AI call yet)
      const docInfo = {
        id: String(savedDoc.id),
        name: savedDoc.filename,
        type: savedDoc.documentType || file.type,
        url: `${BASE_URL}/documents/${savedDoc.id}/file`,
      };
      sessionStorage.setItem('chat_attached_doc', JSON.stringify(docInfo));
      setAttachedDoc(docInfo);

      // Do not send any chat message yet; the document will be attached to the next send
    } catch (e) {
      console.error('Document upload failed:', e);
      const errorMsg = e instanceof Error ? e.message : 'Failed to process document. Please try again.';
      
      // Show error message in chat
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: `❌ Upload Error:\n${errorMsg}`,
        sender: 'assistant',
        timestamp: new Date()
      };
      
      try {
        await addMessageToConversation(errorMessage, { suppressAssistant: true });
      } catch (chatError) {
        console.error('Failed to add error message to chat:', chatError);
        alert(errorMsg);
      }
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
          document: message.document ? { id: (message as any).document?.id, filename: message.document.name, content: '', documentType: message.document.type } : undefined,
          sender: message.sender,
          // Let the backend generate assistant replies unless explicitly suppressed via opts
          suppressAssistant: Boolean(opts?.suppressAssistant),
        })
      });
      if (resp?.messages) {
        setMessages(resp.messages || []);
      } else if (resp?.conversation?.id) {
        const updatedConvData = await fetchWithAuth(`/chat/conversations/${selectedConversation}`);
        setMessages(updatedConvData.messages || []);
      }
      if (resp?.conversation) {
        const updated = resp.conversation as any;
        setConversations((prev) => {
          const others = prev.filter((c) => c.id !== updated.id);
          return [updated, ...others];
        });
      }

      // With server-side AI, backend will append assistant reply. Refresh if needed.
      if (!messages.length) {
        const updatedResp = await fetchWithAuth(`/chat/conversations/${selectedConversation}`);
        const updatedConv = updatedResp as any;
        setMessages(updatedConv.messages || []);
        setConversations((prev) => {
          const others = prev.filter((c) => c.id !== updatedConv.id);
          return [updatedConv, ...others];
        });
      }
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !attachedDoc) || !selectedConversation || isLoading) return;

    // Store the message text before clearing the input
    const messageText = newMessage.trim();
    
    // Clear the input immediately for better UX
    setNewMessage('');
    
    // Set loading state
    setIsLoading(true);

    try {
      // attach document from session if present on the first send
      let attachedDocLocal: Message['document'] | undefined;
      const raw = attachedDoc ? JSON.stringify(attachedDoc) : sessionStorage.getItem('chat_attached_doc');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          attachedDocLocal = { name: parsed.name, type: parsed.type, url: parsed.url } as any;
          (attachedDocLocal as any).id = parsed.id;
        } catch {}
        sessionStorage.removeItem('chat_attached_doc');
        setAttachedDoc(null);
      }

      const message: Message = {
        id: Date.now().toString(),
        text: messageText,
        sender: 'user',
        timestamp: new Date(),
        document: attachedDocLocal,
      };
      // Optimistic UI: show the user's message immediately
      setMessages((prev) => [...prev, message]);

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

  const attachedDocInfo = attachedDoc;

  return (
    <div className="chat-page">
      <style>{`
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.55); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>
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
                    {message.sender === 'assistant' && (
                      <div className="message-avatar" aria-hidden>
                        <span style={{ fontWeight: 700, fontSize: '0.7rem', color: '#374151' }}>MV</span>
                      </div>
                    )}
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
                      <div className="message-text">
                        <div className="markdown-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                            // Headings with better hierarchy
                            h1: ({node, ...props}) => <h1 className="markdown-h1" {...props} />,
                            h2: ({node, ...props}) => <h2 className="markdown-h2" style={{ margin: '6px 0 4px' }} {...props} />,
                            h3: ({node, ...props}) => <h3 className="markdown-h3" style={{ margin: '6px 0 4px' }} {...props} />,
                            // Lists with better spacing
                            ul: ({node, ...props}) => <ul className="markdown-list" style={{ margin: '6px 0 6px 18px', paddingLeft: '16px' }} {...props} />,
                            ol: ({node, ...props}) => <ol className="markdown-list" style={{ margin: '6px 0 6px 18px', paddingLeft: '16px' }} {...props} />,
                            li: ({node, ...props}) => <li className="markdown-list-item" style={{ margin: '2px 0' }} {...props} />,
                            // Emphasis
                            strong: ({node, ...props}) => <strong className="markdown-strong" {...props} />,
                            em: ({node, ...props}) => <em className="markdown-em" {...props} />,
                            // Code blocks
                            code: ({node, className, ...props}: any) => {
                              const isInline = !className;
                              return isInline ? (
                                <code className="markdown-inline-code" {...props} />
                              ) : (
                                <code className="markdown-code-block" {...props} />
                              );
                            },
                            // Paragraphs with spacing
                            p: ({node, ...props}) => <p className="markdown-paragraph" style={{ margin: '6px 0' }} {...props} />,
                            // Blockquotes
                            blockquote: ({node, ...props}) => <blockquote className="markdown-blockquote" {...props} />,
                            // Links
                            a: ({node, ...props}) => <a className="markdown-link" {...props} target="_blank" rel="noopener noreferrer" />,
                          }}
                          >
                            {linkifyCitations(message.text)}
                          </ReactMarkdown>
                        </div>
                        {message.citations && message.citations.length > 0 && (
                          <div className="citations-section">
                            <div className="citations-header">📚 References</div>
                            <div className="citations-list">
                              {message.citations.map((citation, idx) => (
                                <div key={idx} className="citation-item">
                                  <span className="citation-number">[{idx + 1}]</span>
                                  <span className="citation-text">{renderCitationLink(citation)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="message-time">
                        {formatTimestamp(toDate(message.timestamp))}
                      </div>
                    </div>
                    {message.sender === 'user' && (
                      <div className="message-avatar" aria-hidden>
                        <span style={{ fontWeight: 700, fontSize: '0.7rem', color: '#1e40af' }}>You</span>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="message assistant ai-thinking">
                    <div className="message-content">
                      <div className="thinking-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', opacity: 0.85 }} />
                        <div className="thinking-text">Thinking…</div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Context Indicator */}
              {contextInfo && contextInfo.docsUsed > 0 && (
                <div style={{
                  padding: '8px 12px',
                  marginBottom: '8px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#1e40af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>📚</span>
                  <span>Using {contextInfo.docsUsed} {contextInfo.docsUsed === 1 ? 'doc' : 'docs'} · {contextInfo.snippetsUsed} {contextInfo.snippetsUsed === 1 ? 'snippet' : 'snippets'}</span>
                </div>
              )}

              {/* Message Input */}
              <div className="message-input-container">
                {attachedDocInfo && (
                  <div style={{
                    maxWidth: '680px',
                    margin: '0 auto 8px auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '9999px',
                    color: '#1e40af',
                    fontSize: '12px'
                  }}>
                    <span>📄</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{attachedDocInfo.name}</span>
                    <button
                      onClick={() => { sessionStorage.removeItem('chat_attached_doc'); setAttachedDoc(null); }}
                      style={{
                        marginLeft: 'auto',
                        background: 'transparent',
                        border: 'none',
                        color: '#1e40af',
                        cursor: 'pointer'
                      }}
                      aria-label="Remove attached document"
                    >✕</button>
                  </div>
                )}
                <div className="input-area">
                  <button
                    className="document-upload-btn"
                    onClick={() => setShowDocumentUpload(!showDocumentUpload)}
                    title="Upload Document"
                  >
                    📎
                  </button>

                  <textarea
                    id="chat-input"
                    name="chatInput"
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type something friendly…"
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
                    disabled={(!newMessage.trim() && !attachedDocInfo) || isLoading}
                    style={{
                      opacity: isLoading ? 1 : ((!newMessage.trim() && !attachedDocInfo) ? 0.5 : 1),
                      cursor: isLoading ? 'default' : ((!newMessage.trim() && !attachedDocInfo) ? 'not-allowed' : 'pointer'),
                      transition: 'box-shadow 120ms ease',
                      animation: isLoading ? 'pulseGlow 1200ms ease-in-out infinite' : 'none',
                      borderColor: isLoading ? '#3b82f6' : undefined
                    }}
                  >
                    {isLoading ? '…' : '➤'}
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
                        id="document-upload-input"
                        name="documentUpload"
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



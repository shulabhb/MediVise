import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoggedInNavbar from '../components/LoggedInNavbar';
import logo2 from '../assets/MediVise2.png';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const location = useLocation();

  const BASE_URL = 'http://127.0.0.1:8000';

  async function fetchWithAuth(path: string, init?: RequestInit) {
    const token = await user?.getIdToken();
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string> | undefined),
      'Authorization': token ? `Bearer ${token}` : '',
    } as Record<string, string>;
    // only set content-type if body is JSON
    if (init?.body && !(init.headers as any)?.['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
    if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
    return res.json();
  }

  // Initialize from backend and migrate localStorage if needed
  useEffect(() => {
    async function init() {
      if (!user) return;
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
        setConversations(convs as any);
        const currentId = sessionStorage.getItem('current_chat_id');
        if (currentId && (convs as any).find((c: any) => c.id === currentId)) {
          setSelectedConversation(currentId);
        } else if ((convs as any).length > 0) {
          setSelectedConversation((convs as any)[0].id);
          sessionStorage.setItem('current_chat_id', (convs as any)[0].id);
        } else {
          await createNewConversation();
        }
      } catch (e) {
        console.error('Failed to initialize conversations:', e);
      }
    }
    init();
  }, [user]);

  // If navigated with ?new=1, create a fresh conversation and clear the flag
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const createNew = params.get('new') === '1';
    if (createNew) {
      createNewConversation();
      // Remove the query param from the URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
    }
  }, [location.search]);

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
    try {
      const created = await fetchWithAuth('/chat/conversations', { method: 'POST' });
      setConversations((prev) => [created as any, ...prev]);
      setSelectedConversation(created.id);
      sessionStorage.setItem('current_chat_id', created.id);
      setMessages([]);
    } catch (e) {
      console.error('Failed to create conversation:', e);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      alert('Please select a PDF file');
      return;
    }

    // Here you would typically upload to your backend
    // For now, we'll simulate document processing
    const document = {
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file)
    };

    const documentMessage: Message = {
      id: Date.now().toString(),
      text: `Uploaded document: ${file.name}`,
      sender: 'user',
      timestamp: new Date(),
      document
    };

    await addMessageToConversation(documentMessage);
    setShowDocumentUpload(false);
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

  const addMessageToConversation = async (message: Message) => {
    if (!selectedConversation) return;
    try {
      const resp = await fetchWithAuth('/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: selectedConversation,
          message: message.text,
          document: message.document ? { filename: message.document.name, content: '', documentType: message.document.type } : undefined,
        })
      });
      const updated = resp.conversation as any;
      setMessages(updated.messages || []);
      setConversations((prev) => {
        const others = prev.filter((c) => c.id !== updated.id);
        return [updated, ...others];
      });
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date()
    };

    await addMessageToConversation(message);
    setNewMessage('');
    // Backend immediately returns assistant message; no simulated delay
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
                  key={conversation.id}
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
                    <div className="suggestion-chips">
                      {[
                        'Summarize this medical PDF',
                        'Explain a lab result simply',
                        'Side effects of my medication',
                        'Key info from this document',
                        'Prepare questions for my doctor',
                        'Translate this note to plain English',
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
                {messages.map((message) => (
                  <div
                    key={message.id}
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
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={1}
                  />

                  <button
                    className="send-btn"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isLoading}
                  >
                    Send
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



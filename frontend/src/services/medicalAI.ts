import { useAuth } from '../context/AuthContext';
import type { 
  SummaryResponse, 
  SummaryRequest, 
  ChatResponse, 
  ConversationalChatRequest 
} from '../types/ai';

export interface MedicalSummary {
  summary: string;
  medications: Array<{
    name: string;
    details: string;
  }>;
  highlights: string[];
  processed_at: string;
  model_used: string;
}

export interface MedicalAnswer {
  question: string;
  answer: string;
  answered_at: string;
  model_used: string;
}

class MedicalAIService {
  private baseURL = (import.meta as any).env?.VITE_API_BASE ?? 'http://127.0.0.1:8000';

  private getAuthHeaders(token: string): HeadersInit {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Retry helper with exponential backoff (max 3 retries)
   */
  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    maxRetries: number = 3
  ): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, init);
        
        // Retry on 5xx errors and network errors, but not on 4xx (client errors)
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }
        
        // For 5xx errors, wait and retry
        if (response.status >= 500 && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Retry on network errors
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }
    
    throw lastError || new Error('Request failed after retries');
  }

  async summarizeDocument(documentText: string, token: string): Promise<MedicalSummary> {
    try {
      const headers = this.getAuthHeaders(token);
      const response = await fetch(`${this.baseURL}/ai/summarize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ document_text: documentText }),
      });

      if (!response.ok) {
        throw new Error(`Failed to summarize document: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        summary: data.summary,
        medications: data.medications || [],
        highlights: data.highlights || [],
        processed_at: data.processed_at,
        model_used: data.model_used,
      };
    } catch (error) {
      console.error('Error summarizing document:', error);
      throw error;
    }
  }

  async askQuestion(documentText: string, question: string, token: string): Promise<MedicalAnswer> {
    try {
      const headers = this.getAuthHeaders(token);
      const response = await fetch(`${this.baseURL}/ai/ask-question`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          document_text: documentText,
          question: question 
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to answer question: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        question: data.question,
        answer: data.answer,
        answered_at: data.answered_at,
        model_used: data.model_used,
      };
    } catch (error) {
      console.error('Error asking question:', error);
      throw error;
    }
  }

  async summarizeDocumentById(documentId: string, token: string): Promise<MedicalSummary> {
    try {
      const headers = this.getAuthHeaders(token);
      const response = await fetch(`${this.baseURL}/ai/summarize-document/${documentId}`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to summarize document: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        summary: data.summary,
        medications: data.medications || [],
        highlights: data.highlights || [],
        processed_at: data.processed_at,
        model_used: data.model_used,
      };
    } catch (error) {
      console.error('Error summarizing document by ID:', error);
      throw error;
    }
  }

  async askDocumentQuestion(documentId: string, question: string, token: string): Promise<MedicalAnswer> {
    try {
      const headers = this.getAuthHeaders(token);
      const response = await fetch(`${this.baseURL}/ai/ask-document-question/${documentId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`Failed to answer question: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        question: data.question,
        answer: data.answer,
        answered_at: data.answered_at,
        model_used: data.model_used,
      };
    } catch (error) {
      console.error('Error asking document question:', error);
      throw error;
    }
  }

  // Enhanced chat response using medical AI with conversation context
  async getMedicalChatResponse(
    userMessage: string, 
    token: string,
    contextDocument?: string, 
    conversationHistory?: Array<{role: string, content: string}>,
    userDocuments?: Array<{id: string, filename: string, summary?: string}>
  ): Promise<string> {
    try {
      const headers = this.getAuthHeaders(token);
      
      // Prepare the enhanced request payload
      const payload = {
        user_message: userMessage,
        context_document: contextDocument || null,
        conversation_history: conversationHistory || [],
        user_documents: userDocuments || [],
        include_insights: true,
        conversational_mode: true
      };

      const response = await fetch(`${this.baseURL}/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to get chat response: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
      
    } catch (error) {
      console.error('Error getting medical chat response:', error);
      
      // Fallback to basic response
      if (contextDocument) {
        try {
          const result = await this.askQuestion(contextDocument, userMessage, token);
          return result.answer;
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
      
      return `I apologize, but I'm having trouble processing your request right now. Please try again, or upload a medical document for more specific assistance.`;
    }
  }

  // Enhanced summarization with map-reduce and citations
  async summarizeDocumentEnhanced(docId: string, style: 'clinical' | 'patient-friendly' = 'patient-friendly', token: string): Promise<SummaryResponse> {
    try {
      const headers = this.getAuthHeaders(token);
      const response = await this.fetchWithRetry(
        `${this.baseURL}/ai/summarize/document/${docId}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ style }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to summarize document: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error summarizing document:', error);
      throw error;
    }
  }

  // Enhanced chat with document context
  async getEnhancedMedicalChatResponse(
    userMessage: string,
    token: string,
    conversationHistory: Array<{role: string, content: string}> = [],
    userDocuments: Array<{id: string, filename: string, summary?: string}> = []
  ): Promise<ChatResponse> {
    try {
      const headers = this.getAuthHeaders(token);
      
      const payload: ConversationalChatRequest = {
        user_message: userMessage,
        conversation_history: conversationHistory,
        user_documents: userDocuments,
        include_insights: true,
        conversational_mode: true
      };

      const response = await this.fetchWithRetry(
        `${this.baseURL}/ai/chat/enhanced`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get enhanced chat response: ${response.statusText}`);
      }

      return await response.json();
      
    } catch (error) {
      console.error('Error getting enhanced medical chat response:', error);
      throw error;
    }
  }

  // Enhanced document Q&A with citations
  async askDocumentQuestionEnhanced(docId: string, question: string, token: string): Promise<ChatResponse> {
    try {
      const headers = this.getAuthHeaders(token);
      const response = await this.fetchWithRetry(
        `${this.baseURL}/ai/ask-document-question/${docId}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ question }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to answer question: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error asking enhanced document question:', error);
      throw error;
    }
  }

  // Get user's documents for context
  async getUserDocuments(token: string): Promise<Array<{id: string, filename: string, summary?: string}>> {
    try {
      const headers = this.getAuthHeaders(token);
      const response = await fetch(`${this.baseURL}/documents`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get documents: ${response.statusText}`);
      }

      const documents = await response.json();
      return documents.map((doc: any) => ({
        id: doc.id,
        filename: doc.filename,
        summary: doc.content_preview || undefined
      }));
    } catch (error) {
      console.error('Error getting user documents:', error);
      return [];
    }
  }
}

export const medicalAI = new MedicalAIService();

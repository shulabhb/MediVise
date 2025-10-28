import httpx
import json
import os
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import logging

# Import new modules
from .schemas_summary import SummaryResponse, SummarySection, RiskFlag, ChatResponse, DocumentSnippet
from .textops import chunk_text_with_overlap, deidentify_phi, estimate_line_numbers
from .llm_prompts import (
    SUMMARY_SYSTEM, SUMMARY_USER_TEMPLATE, SUMMARY_REDUCE_TEMPLATE,
    QA_SYSTEM, QA_USER_TEMPLATE, MEDICATION_EXTRACTION_SYSTEM, RISK_ASSESSMENT_SYSTEM
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MedicalLLMService:
    """
    Service for interacting with local Ollama LLMs for medical document analysis.
    Supports both document summarization and Q&A functionality.
    """
    
    def __init__(self, model_name: str = "phi4-mini", base_url: str = "http://localhost:11434"):
        self.model_name = model_name
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=60.0)
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def _make_request(self, prompt: str, system_prompt: str = None) -> str:
        """Make a request to the Ollama API"""
        try:
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,  # Lower temperature for more consistent medical responses
                    "top_p": 0.9,
                    "top_k": 40,
                    "repeat_penalty": 1.1,
                    "num_ctx": 4096,  # Context window
                }
            }
            
            if system_prompt:
                payload["system"] = system_prompt
                
            response = await self.client.post(
                f"{self.base_url}/api/generate",
                json=payload
            )
            response.raise_for_status()
            
            result = response.json()
            return result.get("response", "").strip()
            
        except httpx.RequestError as e:
            logger.error(f"Request error: {e}")
            raise Exception(f"Failed to connect to Ollama: {e}")
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error: {e}")
            raise Exception(f"Ollama API error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            raise Exception(f"LLM service error: {e}")
    
    async def _run_json_prompt(self, system_prompt: str, user_prompt: str, max_retries: int = 3) -> Dict[str, Any]:
        """
        Run a prompt that should return JSON, with retry logic for invalid JSON.
        """
        for attempt in range(max_retries):
            try:
                response = await self._make_request(user_prompt, system_prompt)
                
                # Try to parse as JSON
                try:
                    return json.loads(response)
                except json.JSONDecodeError:
                    # If JSON parsing fails, try to extract JSON from response
                    json_match = None
                    
                    # Look for JSON blocks in the response
                    lines = response.split('\n')
                    json_start = -1
                    json_end = -1
                    
                    for i, line in enumerate(lines):
                        line = line.strip()
                        if line.startswith('{'):
                            json_start = i
                        elif line.endswith('}') and json_start >= 0:
                            json_end = i
                            break
                    
                    if json_start >= 0 and json_end >= 0:
                        json_text = '\n'.join(lines[json_start:json_end + 1])
                        try:
                            json_match = json.loads(json_text)
                        except json.JSONDecodeError:
                            pass
                    
                    if json_match:
                        return json_match
                    
                    # If still no valid JSON, try to repair common issues
                    if attempt < max_retries - 1:
                        repair_prompt = f"""The previous response was not valid JSON. Please fix it and return only valid JSON:

Previous response:
{response}

Please return only valid JSON without any additional text."""
                        user_prompt = repair_prompt
                        continue
                    else:
                        # Last attempt - return a basic structure
                        logger.warning(f"Could not parse JSON after {max_retries} attempts, using fallback")
                        return {
                            "sections": [{"title": "Summary", "bullets": [response[:200]], "citations": []}],
                            "risks": []
                        }
                        
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"JSON prompt failed after {max_retries} attempts: {e}")
                    # Return a basic fallback structure
                    return {
                        "sections": [{"title": "Summary", "bullets": ["Unable to process document"], "citations": []}],
                        "risks": []
                    }
                logger.warning(f"JSON prompt attempt {attempt + 1} failed: {e}")
                continue
        
        raise Exception("Failed to get valid JSON response")
    
    async def summarize_text_map_reduce(self, text: str, style: str = "patient-friendly", doc_id: Optional[int] = None) -> SummaryResponse:
        """
        Summarize text using map-reduce pattern for long documents.
        
        Args:
            text: Document text to summarize
            style: "clinical" or "patient-friendly"
            doc_id: Optional document ID for citations
            
        Returns:
            SummaryResponse with sections and risks
        """
        try:
            # De-identify PHI first
            deidentified_text, redactions_applied = deidentify_phi(text)
            
            # Chunk the text
            chunks = chunk_text_with_overlap(deidentified_text)
            logger.info(f"Processing {len(chunks)} chunks for summarization")
            
            # Map phase: summarize each chunk
            partial_summaries = []
            for idx, chunk in chunks:
                try:
                    # Estimate line numbers for citation
                    line_ref = estimate_line_numbers(chunk, idx * (3000 - 300))  # Approximate position
                    citation = f"p1:{line_ref}"  # Assume single page for now
                    
                    user_prompt = SUMMARY_USER_TEMPLATE.format(
                        idx=idx,
                        style=style,
                        chunk=chunk
                    )
                    
                    partial_result = await self._run_json_prompt(SUMMARY_SYSTEM, user_prompt)
                    partial_summaries.append(partial_result)
                    
                except Exception as e:
                    logger.warning(f"Failed to summarize chunk {idx}: {e}")
                    continue
            
            if not partial_summaries:
                raise Exception("No chunks could be summarized")
            
            # Reduce phase: combine partial summaries
            if len(partial_summaries) == 1:
                # Single chunk, return as-is
                result = partial_summaries[0]
            else:
                # Multiple chunks, combine them
                partials_text = "\n\n".join([json.dumps(p) for p in partial_summaries])
                reduce_prompt = SUMMARY_REDUCE_TEMPLATE.format(
                    style=style,
                    partials=partials_text
                )
                
                result = await self._run_json_prompt(SUMMARY_SYSTEM, reduce_prompt)
            
            # Convert to SummaryResponse
            sections = []
            for section_data in result.get("sections", []):
                section = SummarySection(
                    title=section_data.get("title", "Untitled"),
                    bullets=section_data.get("bullets", []),
                    citations=section_data.get("citations", [])
                )
                sections.append(section)
            
            risks = []
            for risk_data in result.get("risks", []):
                risk = RiskFlag(
                    code=risk_data.get("code", "UNKNOWN"),
                    severity=risk_data.get("severity", "low"),
                    rationale=risk_data.get("rationale", ""),
                    citations=risk_data.get("citations", [])
                )
                risks.append(risk)
            
            return SummaryResponse(
                doc_id=doc_id,
                style=style,
                sections=sections,
                risks=risks,
                redactions_applied=redactions_applied
            )
            
        except Exception as e:
            logger.error(f"Error in map-reduce summarization: {e}")
            raise Exception(f"Failed to summarize document: {e}")
    
    async def rag_answer(self, question: str, snippets: List[DocumentSnippet]) -> ChatResponse:
        """
        Answer a question using RAG (Retrieval-Augmented Generation) with document snippets.
        
        Args:
            question: User's question
            snippets: List of relevant document snippets with citations
            
        Returns:
            ChatResponse with answer and citations
        """
        try:
            # Format snippets for the prompt
            snippets_text = ""
            citations = []
            
            for i, snippet in enumerate(snippets, 1):
                snippets_text += f"Snippet {i} ({snippet.citation}):\n{snippet.text}\n\n"
                citations.append(snippet.citation)
            
            user_prompt = QA_USER_TEMPLATE.format(
                question=question,
                snippets=snippets_text
            )
            
            answer = await self._make_request(user_prompt, QA_SYSTEM)
            
            return ChatResponse(
                answer=answer,
                citations=citations,
                context_used=len(snippets) > 0,
                model_used=self.model_name,
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Error in RAG answer: {e}")
            raise Exception(f"Failed to answer question: {e}")
    
    def _get_medical_summarization_prompt(self, document_text: str) -> tuple[str, str]:
        """Generate system and user prompts for medical document summarization"""
        system_prompt = """You are MediVise, a medical AI assistant specialized in simplifying complex medical documents for patients. Your role is to:

1. Transform medical jargon into plain, understandable language
2. Highlight critical information that patients need to know
3. Identify medications, dosages, and important instructions
4. Point out potential risks, side effects, or warnings
5. Provide clear, actionable information

Guidelines:
- Use simple, non-technical language
- Be empathetic and supportive
- Focus on what the patient needs to do
- Highlight urgent or important information
- Maintain medical accuracy while being accessible
- Never provide diagnostic advice - only explain what's in the document

Format your response as a clear, structured summary."""

        user_prompt = f"""Please analyze and summarize this medical document in plain language for a patient:

DOCUMENT TEXT:
{document_text}

Please provide:
1. A clear summary of the main findings or diagnosis
2. Key medications mentioned (name, dosage, frequency)
3. Important instructions or precautions
4. Any warnings or side effects to be aware of
5. Next steps or follow-up requirements

Make this information easy to understand for someone without medical training."""

        return system_prompt, user_prompt
    
    def _get_medical_qa_prompt(self, document_text: str, question: str) -> tuple[str, str]:
        """Generate system and user prompts for medical Q&A"""
        system_prompt = """You are MediVise, a medical AI assistant that helps patients understand their medical documents. Your role is to:

1. Answer questions based ONLY on the provided medical document
2. Explain medical terms in simple language
3. Help patients understand their conditions, medications, and treatments
4. Provide context and clarification about medical information

IMPORTANT LIMITATIONS:
- Only answer based on information in the provided document
- If information is not in the document, clearly state this
- Never provide diagnostic advice or medical recommendations
- Always remind users to consult their healthcare provider for medical decisions
- If asked about something not in the document, say "This information is not available in your uploaded document"

Be helpful, clear, and supportive while staying within these boundaries."""

        user_prompt = f"""Based on this medical document, please answer the patient's question:

DOCUMENT TEXT:
{document_text}

PATIENT'S QUESTION:
{question}

Please provide a clear, helpful answer based only on the information in the document. If the question cannot be answered from the document, please explain what information is available and suggest they consult their healthcare provider."""

        return system_prompt, user_prompt
    
    async def summarize_medical_document(self, document_text: str) -> Dict[str, Any]:
        """
        Summarize a medical document using the LLM
        
        Args:
            document_text: The extracted text from the medical document
            
        Returns:
            Dictionary containing summary, medications, and highlights
        """
        try:
            system_prompt, user_prompt = self._get_medical_summarization_prompt(document_text)
            
            logger.info(f"Summarizing document with {len(document_text)} characters")
            summary = await self._make_request(user_prompt, system_prompt)
            
            # Extract structured information from the summary
            result = {
                "summary": summary,
                "medications": self._extract_medications(summary),
                "highlights": self._extract_highlights(summary),
                "processed_at": datetime.now().isoformat(),
                "model_used": self.model_name
            }
            
            logger.info("Document summarization completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error in document summarization: {e}")
            raise Exception(f"Failed to summarize document: {e}")
    
    async def answer_medical_question(self, document_text: str, question: str) -> Dict[str, Any]:
        """
        Answer a question about a medical document
        
        Args:
            document_text: The extracted text from the medical document
            question: The patient's question
            
        Returns:
            Dictionary containing the answer and metadata
        """
        try:
            system_prompt, user_prompt = self._get_medical_qa_prompt(document_text, question)
            
            logger.info(f"Answering question: {question[:100]}...")
            answer = await self._make_request(user_prompt, system_prompt)
            
            result = {
                "question": question,
                "answer": answer,
                "answered_at": datetime.now().isoformat(),
                "model_used": self.model_name,
                "context_length": len(document_text)
            }
            
            logger.info("Question answered successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error answering question: {e}")
            raise Exception(f"Failed to answer question: {e}")
    
    def _extract_medications(self, summary: str) -> List[Dict[str, str]]:
        """Extract medication information from the summary"""
        medications = []
        
        # Simple keyword-based extraction (can be enhanced with NLP)
        lines = summary.split('\n')
        current_med = {}
        
        for line in lines:
            line = line.strip()
            if any(keyword in line.lower() for keyword in ['medication', 'medicine', 'drug', 'prescription', 'take', 'mg', 'tablet', 'capsule']):
                if current_med:
                    medications.append(current_med)
                current_med = {"name": line, "details": ""}
            elif current_med and line:
                current_med["details"] += line + " "
        
        if current_med:
            medications.append(current_med)
        
        return medications[:5]  # Limit to top 5 medications
    
    def _extract_highlights(self, summary: str) -> List[str]:
        """Extract key highlights from the summary"""
        highlights = []
        
        # Look for important keywords and phrases
        important_keywords = [
            'important', 'warning', 'caution', 'side effect', 'allergy',
            'avoid', 'stop', 'immediately', 'urgent', 'emergency',
            'follow up', 'appointment', 'schedule', 'next steps'
        ]
        
        sentences = summary.split('.')
        for sentence in sentences:
            sentence = sentence.strip()
            if any(keyword in sentence.lower() for keyword in important_keywords):
                if len(sentence) > 10:  # Avoid very short fragments
                    highlights.append(sentence)
        
        return highlights[:5]  # Limit to top 5 highlights

# Global instance for easy access
llm_service = MedicalLLMService()

# Convenience functions for direct use
async def summarize_document(document_text: str) -> Dict[str, Any]:
    """Convenience function to summarize a medical document"""
    async with MedicalLLMService() as service:
        return await service.summarize_medical_document(document_text)

async def answer_question(document_text: str, question: str) -> Dict[str, Any]:
    """Convenience function to answer a question about a medical document"""
    async with MedicalLLMService() as service:
        return await service.answer_medical_question(document_text, question)

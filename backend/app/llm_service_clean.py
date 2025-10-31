import httpx
from fastapi import HTTPException
import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import re

# Import schemas and prompts
from .schemas_summary import SummaryResponse, SummarySection, RiskFlag, ChatResponse, DocumentSnippet
from .textops import chunk_text_with_overlap, deidentify_phi, estimate_line_numbers
from .llm_prompts import (
    SUMMARY_SYSTEM, SUMMARY_USER_TEMPLATE, SUMMARY_REDUCE_TEMPLATE,
    QA_SYSTEM, QA_USER_TEMPLATE
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MedicalLLMService:
    """
    Clean, single-path LLM service: JSON → deterministic rendering.
    No more duplicate headings or fragile regex normalization.
    """
    
    def __init__(self, model_name: Optional[str] = None, base_url: Optional[str] = None):
        self.model_name = model_name or os.getenv("LLM_MODEL", "phi4-mini")
        self.base_url = base_url or os.getenv("LLM_BASE_URL", "http://127.0.0.1:11434")
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(90.0, connect=5.0))
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()

    async def health(self) -> Dict[str, Any]:
        """Ping the LLM server to verify connectivity and model availability."""
        try:
            r = await self.client.get(f"{self.base_url}/api/tags")
            r.raise_for_status()
            data = r.json()
            models = [m.get("name") for m in data.get("models", [])] if isinstance(data, dict) else []
            return {"ok": True, "base_url": self.base_url, "model": self.model_name, "available_models": models}
        except Exception as e:
            logger.error(f"LLM health failed: {e}")
            raise HTTPException(status_code=502, detail={"error": "llm_health_failed", "message": str(e)})
    
    async def _make_request(self, prompt: str, system_prompt: str = None) -> str:
        """Make a request to the Ollama API"""
        try:
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.9,
                    "top_k": 40,
                    "repeat_penalty": 1.1,
                    "num_ctx": 4096,
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
            
        except httpx.TimeoutException as e:
            logger.error(f"LLM timeout: {e}")
            raise HTTPException(status_code=502, detail={"error": "llm_upstream_timeout", "message": str(e)})
        except httpx.RequestError as e:
            logger.error(f"Request error: {e}")
            raise HTTPException(status_code=502, detail={"error": "llm_connection_error", "message": str(e)})
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error: {e}")
            raise HTTPException(status_code=502, detail={"error": "llm_http_error", "message": str(e)})
        except Exception as e:
            logger.error(f"Unexpected LLM error: {e}")
            raise HTTPException(status_code=502, detail={"error": "llm_service_error", "message": str(e)})
    
    async def _run_json_prompt(self, system_prompt: str, user_prompt: str, max_retries: int = 3) -> Dict[str, Any]:
        """Run a prompt that should return JSON, with retry logic for invalid JSON."""
        for attempt in range(max_retries):
            try:
                response = await self._make_request(user_prompt, system_prompt)
                
                try:
                    return json.loads(response)
                except json.JSONDecodeError:
                    # Try to extract JSON from response
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
                            return json.loads(json_text)
                        except json.JSONDecodeError:
                            pass
                    
                    if attempt < max_retries - 1:
                        repair_prompt = f"""The previous response was not valid JSON. Please fix it and return only valid JSON:

Previous response:
{response}

Please return only valid JSON without any additional text."""
                        user_prompt = repair_prompt
                        continue
                    else:
                        logger.warning(f"Could not parse JSON after {max_retries} attempts, using fallback")
                        return {
                            "sections": [{"title": "Summary", "bullets": [response[:200]], "citations": []}],
                            "risks": []
                        }
                        
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"JSON prompt failed after {max_retries} attempts: {e}")
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
        Returns structured JSON (SummaryResponse).
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
                    line_ref = estimate_line_numbers(chunk, idx * (3000 - 300))
                    citation = f"p1:{line_ref}"
                    
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
                result = partial_summaries[0]
            else:
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
            
            summary_response = SummaryResponse(
                doc_id=doc_id,
                style=style,
                sections=sections,
                risks=risks,
                redactions_applied=redactions_applied
            )
            
            # Coerce to single occurrence of each section
            return self._coerce_single_summary(summary_response)
            
        except Exception as e:
            logger.error(f"Error in map-reduce summarization: {e}")
            raise Exception(f"Failed to summarize document: {e}")
    
    def _coerce_single_summary(self, s: SummaryResponse) -> SummaryResponse:
        """Ensure each section title appears only once; merge bullets if duplicates."""
        seen = set()
        uniq_sections = []
        for sec in s.sections:
            t = (sec.title or "Summary").strip().title()
            if t in seen:
                # Merge bullets into first occurrence
                for i, u in enumerate(uniq_sections):
                    if (u.title or "").strip().title() == t:
                        uniq_sections[i].bullets = self._dedupe_preserve((u.bullets or []) + (sec.bullets or []))
                        break
            else:
                seen.add(t)
                sec.title = t
                uniq_sections.append(sec)
        s.sections = uniq_sections
        return s
    
    def _dedupe_preserve(self, items: List[str]) -> List[str]:
        """Deduplicate list while preserving order."""
        seen, out = set(), []
        for it in items:
            k = (it or "").strip().lower()
            if not k or k in seen:
                continue
            seen.add(k)
            out.append(it)
        return out
    
    def _render_summary_markdown(self, s: SummaryResponse) -> str:
        """
        Deterministically render SummaryResponse to markdown.
        Guarantees one heading per section, no duplicate "Summary: Summary:".
        """
        order = [
            "Summary", "Findings", "What It Means", "Key Medications",
            "Important Instructions Or Precautions", "Warnings Or Side Effects",
            "Red Flags", "Next Steps", "Key Highlights"
        ]
        
        # Normalize titles and group bullets
        sections_by_title: Dict[str, List[str]] = {}
        for sec in s.sections:
            title = (sec.title or "Summary").strip().title()
            sections_by_title.setdefault(title, [])
            bullets = [b.strip() for b in (sec.bullets or []) if b and b.strip()]
            if bullets:
                sections_by_title[title].extend(bullets)
        
        lines = []
        for title in order:
            bullets = sections_by_title.get(title, [])
            if not bullets and title != "Next Steps":
                continue
            
            lines.append(f"**{title}:**")
            
            if title == "Next Steps":
                # Keep it single-line if present
                if bullets:
                    lines.append(bullets[0])
                lines.append("")
                continue
            
            for b in self._dedupe_preserve(bullets)[:8]:  # Cap at 8 bullets per section
                lines.append(f"- {b}")
            lines.append("")  # Blank line between sections
        
        return "\n".join(lines).strip()
    
    async def summarize_medical_document(self, document_text: str) -> Dict[str, Any]:
        """
        SINGLE PATH: JSON map-reduce → deterministic markdown rendering.
        No more free-form prose generation or fragile regex normalization.
        """
        try:
            logger.info(f"Summarizing document with {len(document_text)} characters")
            
            # 1) Run JSON map-reduce once
            summary_json = await self.summarize_text_map_reduce(
                text=document_text,
                style="patient-friendly",
                doc_id=None
            )
            
            # 2) Render to markdown deterministically
            summary_md = self._render_summary_markdown(summary_json)
            
            # 3) Extract structured data from JSON (not markdown scraping)
            result = {
                "summary": summary_md,
                "medications": self._extract_medications_from_json(summary_json),
                "highlights": self._extract_highlights_from_json(summary_json),
                "processed_at": datetime.now().isoformat(),
                "model_used": self.model_name
            }
            
            logger.info("Document summarization completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error in document summarization: {e}")
            raise Exception(f"Failed to summarize document: {e}")
    
    def _extract_medications_from_json(self, s: SummaryResponse) -> List[Dict[str, str]]:
        """Extract medications directly from JSON sections."""
        meds = []
        for sec in s.sections:
            title = (sec.title or "").strip().lower()
            if "medication" in title:
                for b in sec.bullets or []:
                    meds.append({"name": b, "details": ""})
        return meds[:5]
    
    def _extract_highlights_from_json(self, s: SummaryResponse) -> List[str]:
        """Extract highlights directly from JSON sections."""
        for target in ["key highlights", "important instructions or precautions", "red flags"]:
            for sec in s.sections:
                title = (sec.title or "").strip().lower()
                if title == target:
                    return (sec.bullets or [])[:5]
        return []
    
    async def rag_answer(self, question: str, snippets: List[DocumentSnippet]) -> ChatResponse:
        """
        Answer a question using RAG with document snippets.
        Lightweight post-processing, no heavy normalization.
        """
        try:
            def _mask_phi(s: str) -> str:
                try:
                    s = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", "[REDACTED_SSN]", s)
                    s = re.sub(r"\b\d{3}-\d{3}-\d{4}\b", "[REDACTED_PHONE]", s)
                    s = re.sub(r"\(\d{3}\)\s*\d{3}-\d{4}", "[REDACTED_PHONE]", s)
                    s = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[REDACTED_EMAIL]", s)
                    s = re.sub(r"\b(?:MRN|Patient ID|Acct|Account)\s*:?\s*\w+\b", "[REDACTED_ID]", s, flags=re.IGNORECASE)
                except Exception:
                    pass
                return s

            # Format snippets (humanized, max 5 unique)
            snippets_text = ""
            citations = []
            seen = set()
            for snippet in snippets:
                if len(seen) >= 5:
                    break
                cit = snippet.citation or ""
                if cit in seen:
                    continue
                seen.add(cit)
                masked_text = _mask_phi(snippet.text or "")
                snippets_text += f"- from your notes: {masked_text}\n"
                citations.append(cit)
            
            user_prompt = QA_USER_TEMPLATE.format(
                question=question,
                snippets=snippets_text
            )
            
            answer = await self._make_request(user_prompt, QA_SYSTEM)

            # Lightweight cleanup: dedupe sentences, humanize citations, clamp length
            answer = self._dedupe_sentences(answer)
            answer = self._clamp_sentences(answer, 14)
            answer = re.sub(r"Snippet\s*\d+", "from your notes", answer, flags=re.IGNORECASE)
            answer = self._strip_signoffs(answer)
            
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

    def _dedupe_sentences(self, text: str) -> str:
        """Remove duplicate sentences while preserving order."""
        try:
            parts = re.split(r"(?<=[.!?])\s+", text.strip())
            seen = set()
            out: List[str] = []
            for p in parts:
                k = p.strip().lower()
                if not k or k in seen:
                    continue
                seen.add(k)
                out.append(p.strip())
            return " ".join(out)
        except Exception:
            return text

    def _clamp_sentences(self, text: str, max_sentences: int) -> str:
        """Limit to max_sentences."""
        try:
            parts = re.split(r"(?<=[.!?])\s+", text.strip())
            if len(parts) <= max_sentences:
                return text.strip()
            return " ".join(parts[:max_sentences]).strip()
        except Exception:
            return text

    def _strip_signoffs(self, text: str) -> str:
        """Remove common sign-offs."""
        try:
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            filtered = []
            for l in lines:
                if re.search(r"^(Best|Regards|Sincerely|Stay safe|Take care|Your Assistant)\b", l, flags=re.IGNORECASE):
                    continue
                filtered.append(l)
            return "\n".join(filtered).strip()
        except Exception:
            return text

    async def answer_medical_question(self, document_text: str, question: str) -> Dict[str, Any]:
        """
        Answer a question about a medical document.
        Kept for compatibility but uses minimal processing.
        """
        try:
            logger.info(f"Answering question: {question[:100]}...")
            
            # Simple QA prompt
            system_prompt = """You are a medical AI assistant. Answer based ONLY on the document provided.
Use simple language (6th-8th grade). Be warm and supportive. If info is not in the document, say so clearly."""
            
            user_prompt = f"""Based on this medical document, answer the patient's question:

DOCUMENT:
{document_text[:3000]}

QUESTION:
{question}

Answer clearly in 3-6 sentences. If the document doesn't contain the answer, say so."""
            
            answer = await self._make_request(user_prompt, system_prompt)
            answer = self._strip_signoffs(answer)
            
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


# Global instance
llm_service = MedicalLLMService()

# Convenience functions
async def summarize_document(document_text: str) -> Dict[str, Any]:
    """Convenience function to summarize a medical document"""
    async with MedicalLLMService() as service:
        return await service.summarize_medical_document(document_text)

async def answer_question(document_text: str, question: str) -> Dict[str, Any]:
    """Convenience function to answer a question about a medical document"""
    async with MedicalLLMService() as service:
        return await service.answer_medical_question(document_text, question)


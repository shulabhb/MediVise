import httpx
from fastapi import HTTPException
import json
import os
from typing import Dict, List, Optional, Any, Tuple
import os
from datetime import datetime
import logging
import re

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

# Lightweight heuristic to decide whether to use memory/docs
def should_use_memory(message: str) -> bool:
    try:
        msg = (message or "").strip().lower()
        if not msg:
            return False
        # Skip if message is very short or greeting-like
        if len(msg.split()) < 4:
            return False
        medical_keywords = [
            "pain","symptom","symptoms","lab","labs","report","record","records",
            "test","tests","appointment","appointments","medication","medications",
            "dose","dosing","fever","result","results","diagnosis","condition",
            "allergy","allergies","side effect","side effects","blood pressure","glucose",
            "alcohol","drink","drinking","etoh"
        ]
        return any(k in msg for k in medical_keywords)
    except Exception:
        return False

class MedicalLLMService:
    """
    Service for interacting with local Ollama LLMs for medical document analysis.
    Supports both document summarization and Q&A functionality.
    """
    
    def __init__(self, model_name: Optional[str] = None, base_url: Optional[str] = None):
        # Allow env override to avoid host/model mismatch
        self.model_name = model_name or os.getenv("LLM_MODEL", "phi4-mini")
        self.base_url = base_url or os.getenv("LLM_BASE_URL", "http://127.0.0.1:11434")
        # Explicit connect/read timeouts (extended for richer summaries)
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
            # PHI guard: mask identifiers (emails, phones, SSN, MRN/Patient IDs) in snippet text only
            def _mask_phi(s: str) -> str:
                try:
                    import re
                    s = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", "[REDACTED_SSN]", s)
                    s = re.sub(r"\b\d{3}-\d{3}-\d{4}\b", "[REDACTED_PHONE]", s)
                    s = re.sub(r"\(\d{3}\)\s*\d{3}-\d{4}", "[REDACTED_PHONE]", s)
                    s = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[REDACTED_EMAIL]", s)
                    s = re.sub(r"\b(?:MRN|Patient ID|Acct|Account)\s*:?\s*\w+\b", "[REDACTED_ID]", s, flags=re.IGNORECASE)
                except Exception:
                    pass
                return s

            # Format snippets for the prompt (humanized, no raw IDs, max 5 unique)
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

            # Post-process: dedupe, clamp, soften, single insufficient, humanize citations
            answer = self._dedupe_sentences(answer)
            answer = self._single_insufficient_guard(answer)
            answer = self._soften_imperatives(answer)
            answer = self._clamp_sentences(answer, 14)
            answer = re.sub(r"Snippet\s*\d+", "from your notes", answer, flags=re.IGNORECASE)
            answer = self._strip_signoffs_and_labels(answer)
            answer = self._normalize_markdown(answer)
            
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
        try:
            # Split on sentence enders while preserving simple structure
            parts = re.split(r"(?<=[.!?])\s+", text.strip())
            seen = set()
            out: List[str] = []
            for p in parts:
                k = p.strip()
                if not k:
                    continue
                if k.lower() in seen:
                    continue
                seen.add(k.lower())
                out.append(k)
            return " ".join(out)
        except Exception:
            return text

    def _clamp_sentences(self, text: str, max_sentences: int) -> str:
        try:
            parts = re.split(r"(?<=[.!?])\s+", text.strip())
            if len(parts) <= max_sentences:
                return text.strip()
            return " ".join(parts[:max_sentences]).strip()
        except Exception:
            return text

    def _soften_imperatives(self, text: str) -> str:
        try:
            repl = {
                "Avoid driving": "Try to avoid driving",
                "Do not drive": "Try not to drive",
                "You must": "You may need to",
                "You should": "You might",
                "Start ": "Your care team may start ",
                "Stop ": "Your care team may adjust or stop ",
            }
            out = text
            for k, v in repl.items():
                out = out.replace(k, v)
            return out
        except Exception:
            return text

    def _single_insufficient_guard(self, text: str) -> str:
        try:
            msg = "not enough evidence"
            lines = [l for l in text.splitlines() if l.strip()]
            kept: List[str] = []
            flagged = False
            for l in lines:
                if msg in l.lower():
                    flagged = True
                else:
                    kept.append(l)
            if flagged:
                kept.append("Not enough evidence in your documents to answer fully.")
            return "\n".join(kept)
        except Exception:
            return text

    def _strip_signoffs_and_labels(self, text: str) -> str:
        try:
            # Remove bracketed assistant labels and common sign-offs at the end
            t = re.sub(r"\[\s*Your\s+Assistant\s*\]", "", text, flags=re.IGNORECASE)
            # Remove lines ending with sign-offs
            lines = [l for l in t.splitlines() if l.strip()]
            filtered = []
            for l in lines:
                l_stripped = l.strip()
                if re.search(r"^(Best|Regards|Sincerely|Stay safe|Take care)\b", l_stripped, flags=re.IGNORECASE):
                    continue
                filtered.append(l)
            return "\n".join(filtered).strip()
        except Exception:
            return text

    def _normalize_markdown(self, text: str) -> str:
        """Remove orphan bullets/number artifacts and collapse blank lines."""
        try:
            # Standardize common section labels
            t = text
            # Remove conversational preambles at the very start
            t = re.sub(r"\A\s*(Sure!|Sure,|Here is|Here's|In summary|Quick summary)[:!,.\s-]*\n+", "", t, flags=re.IGNORECASE)
            # Aggressively collapse any "Summary: Summary:" variants (case-insensitive, any whitespace)
            t = re.sub(r"(?i)Summary\s*:\s*Summary\s*:\s*", "**Summary:** ", t)
            t = re.sub(r"(?i)\*\*Summary:\*\*\s*Summary\s*:\s*", "**Summary:** ", t)
            t = re.sub(r"(?i)Summary\s*:\s*\*\*Summary:\*\*\s*", "**Summary:** ", t)
            # Convert plain 'Summary:' at start to canonical heading
            t = re.sub(r"\A\s*Summary\s*:\s*", "**Summary:** ", t, flags=re.IGNORECASE)
            # Collapse plain 'Summary: Summary:' anywhere
            t = re.sub(r"(?m)\bSummary\s*:\s*Summary\s*:\s*", "**Summary:** ", t, flags=re.IGNORECASE)
            # Convert numbered headings like "1. Summary:" etc.
            t = re.sub(r"^\s*\d+\.\s*Summary\s*:\s*", "**Summary:** ", t, flags=re.IGNORECASE|re.MULTILINE)
            t = re.sub(r"^\s*\d+\.\s*Key\s+Medications\s*:\s*", "\n\n**Key Medications:**\n", t, flags=re.IGNORECASE|re.MULTILINE)
            t = re.sub(r"^\s*\d+\.\s*Important\s+Instructions(?:\s+or\s+Precautions)?\s*:\s*", "\n\n**Important Instructions or Precautions:**\n", t, flags=re.IGNORECASE|re.MULTILINE)
            t = re.sub(r"^\s*\d+\.\s*Warnings?(?:\s*/\s*Side\s*Effects)?\s*:\s*", "\n\n**Warnings or Side Effects:**\n", t, flags=re.IGNORECASE|re.MULTILINE)
            t = re.sub(r"^\s*\d+\.\s*Next\s*Steps?(?:\s*/\s*Follow\-?Up\s*Requirements)?\s*:\s*", "\n\n**Next steps:** ", t, flags=re.IGNORECASE|re.MULTILINE)
            t = re.sub(r"\*\s*Findings\s*:\s*", "\n\n**Findings:**\n", t, flags=re.IGNORECASE)
            t = re.sub(r"\bFindings\s*:\s*", "**Findings:**\n", t, flags=re.IGNORECASE)
            t = re.sub(r"\bSummary\s*:\s*", "**Summary:** ", t, flags=re.IGNORECASE)
            t = re.sub(r"\bWhat\s+it\s+means\s*:\s*", "**What it means:** ", t, flags=re.IGNORECASE)
            t = re.sub(r"\bRed\s*flags\s*:\s*", "**Red flags:**\n", t, flags=re.IGNORECASE)
            t = re.sub(r"\bNext\s*steps\s*:\s*", "**Next steps:** ", t, flags=re.IGNORECASE)
            # Normalize Key highlights heading
            t = re.sub(r"\bKey\s*highlights\s*:\s*", "**Key highlights:**\n", t, flags=re.IGNORECASE)
            # Ensure any bare headings like "**Findings:" become closed "**Findings:**"
            t = re.sub(r"\*\*(Summary|Findings|What it means|Red flags|Next steps|Key highlights):\s*\n", r"**\1:**\n", t)
            t = re.sub(r"\*\*(Summary|Findings|What it means|Red flags|Next steps|Key highlights):\s*\s", r"**\1:** ", t)
            # Convert plain-text alias headings to canonical bold headings
            alias_patterns = [
                (r"^\s*Main\s+Findings/Diagnosis\s*:\s*$", "**Findings:**"),
                (r"^\s*Diagnosis\s*:\s*$", "**Findings:**"),
                (r"^\s*Instructions/Precautions\s+and\s+Warnings\s*:\s*$", "**Important Instructions or Precautions:**"),
                (r"^\s*Important\s+Instructions/Precautions\s*:\s*$", "**Important Instructions or Precautions:**"),
                (r"^\s*Instructions\s+and\s+Precautions\s*:\s*$", "**Important Instructions or Precautions:**"),
                (r"^\s*Warnings/Side\s*Effects\s*:\s*$", "**Warnings or Side Effects:**"),
                (r"^\s*Side\s*Effects\s*:\s*$", "**Warnings or Side Effects:**"),
                (r"^\s*Patient\s+Education\s*:\s*$", "**What it means:**"),
                (r"^\s*Key\s+Medications\s+Mentioned\s*:\s*$", "**Key Medications:**"),
            ]
            for pat, repl in alias_patterns:
                t = re.sub(pat, repl, t, flags=re.IGNORECASE | re.MULTILINE)

            # Normalize bullet symbol
            t = re.sub(r"^\s*•\s+", "- ", t, flags=re.MULTILINE)
            # Fix double bullets like "- - "
            t = re.sub(r"^\s*-\s*-\s+", "- ", t, flags=re.MULTILINE)

            # Compact bold labels like **Summary: ** -> **Summary:**
            t = re.sub(r"\*\*(\w[\w\s]+?):\s*\*\*", lambda m: f"**{m.group(1).strip()}:**", t)
            # Strip any leaked line-number hints inside '(from your notes …)'
            t = re.sub(r"\(from your notes[^)]*\)", "(from your notes)", t, flags=re.IGNORECASE)
            # Remove orphan '1' lines created by list mis-detection
            t = re.sub(r"\n\s*1\s*\n", "\n", t)
            # Remove standalone numbered lines (e.g., "3.")
            t = re.sub(r"^\s*\d+\.\s*$", "", t, flags=re.MULTILINE)
            # Remove standalone digit-only lines like "1"
            t = re.sub(r"^\s*\d+\s*$", "", t, flags=re.MULTILINE)
            # Convert numbered bullets like "3) text" or "1. text" to dashes
            t = re.sub(r"^\s*\d+[\).]\s+", "- ", t, flags=re.MULTILINE)
            # Remove lines that are only asterisks or stray bold markers
            t = re.sub(r"^\s*\*+\s*$", "", t, flags=re.MULTILINE)
            # Remove headings that are immediately followed by another heading or end (empty section)
            t = re.sub(r"\n\*\*(Summary|Findings|What it means|Red flags|Next steps):\*\*\s*(?:\n\s*)+(?=\*\*|$)", "\n", t, flags=re.IGNORECASE)
            # Deduplicate repeated headings
            t = re.sub(r"(\*\*(Summary|Findings|What it means|Red flags|Next steps):\*\*)(\s*\n)+\1", r"\1\n", t, flags=re.IGNORECASE)

            lines = [l.rstrip() for l in t.splitlines()]
            cleaned = []
            current_section = None
            bullet_sections = {"findings", "red flags", "key highlights", "important instructions or precautions", "warnings or side effects", "key medications"}
            for l in lines:
                # drop disclaimers and boilerplate
                if re.match(r"^\s*(Disclaimer:|Please note|Remember:)", l, flags=re.IGNORECASE):
                    continue
                # drop orphan bullets or single digits
                if l.strip() in {"-", "•", "1", "2"}:
                    continue
                if re.match(r"^\s*[•\-]\s*$", l):
                    continue
                # remove bullets with only punctuation
                if l.strip().startswith(('-','•')) and l.strip() in {'- :', '- : ', '-  ', '- :  '}:
                    continue
                # avoid repeating headings as bullets
                if l.strip().startswith('- **') and l.strip().endswith('**:'):
                    cleaned.append(l.strip()[2:].strip())
                    continue
                # trim leading "* " before bold headings
                l = re.sub(r"^\*\s+(\*\*[^*]+\*\*)", r"\1", l)
                # Track current section
                m = re.match(r"^\*\*(Summary|Findings|What it means|Red flags|Next steps|Key highlights):\*\*", l, flags=re.IGNORECASE)
                if m:
                    current_section = m.group(1).lower()
                    cleaned.append(l)
                    continue
                # Auto-bullet short lines inside bullet sections if they aren't already bulleted
                if current_section in bullet_sections:
                    s = l.strip()
                    if s and not s.startswith("-") and not s.startswith("•"):
                        # Split inline dash lists into bullets
                        if ' - ' in s:
                            parts = [p.strip() for p in s.split(' - ') if p.strip()]
                            for part in parts:
                                cleaned.append(f"- {part}")
                            continue
                        # Consider paragraph vs bullet: keep as bullet if short or single-sentence
                        sentences = re.split(r"(?<=[.!?])\s+", s)
                        if len(s) < 160 or len([x for x in sentences if x]) <= 1:
                            cleaned.append(f"- {s}")
                            continue
                cleaned.append(l)
            # collapse multiple blank lines
            out = []
            prev_blank = False
            for l in cleaned:
                is_blank = (l.strip() == "")
                if is_blank and prev_blank:
                    continue
                out.append(l)
                prev_blank = is_blank
            normalized = "\n".join(out).strip()

            # Second pass: canonicalize sections and rebuild in fixed order
            try:
                lines2 = normalized.splitlines()
                # Map heading variants to canonical
                alias_map = {
                    "summary": "Summary",
                    "findings": "Findings",
                    "main findings/diagnosis": "Findings",
                    "diagnosis": "Findings",
                    "what it means": "What it means",
                    "patient education": "What it means",
                    "key medications mentioned": "Key Medications",
                    "key medications": "Key Medications",
                    "instructions/precautions and warnings": "Important Instructions or Precautions",
                    "instructions and precautions": "Important Instructions or Precautions",
                    "important instructions/precautions": "Important Instructions or Precautions",
                    "important instructions or precautions": "Important Instructions or Precautions",
                    "warnings": "Warnings or Side Effects",
                    "warnings/side effects": "Warnings or Side Effects",
                    "side effects": "Warnings or Side Effects",
                    "warnings or side effects": "Warnings or Side Effects",
                    "red flags": "Red flags",
                    "next steps": "Next steps",
                    "next steps/follow-up requirements": "Next steps",
                    "follow-up requirements": "Next steps",
                    "key highlights": "Key highlights",
                }
                section_order = [
                    "Summary",
                    "Findings",
                    "What it means",
                    "Key Medications",
                    "Important Instructions or Precautions",
                    "Warnings or Side Effects",
                    "Red flags",
                    "Next steps",
                    "Key highlights",
                ]
                bullet_sections = {"findings", "red flags", "key highlights", "important instructions or precautions", "warnings or side effects", "key medications"}

                sections: dict[str, list[str]] = {k: [] for k in section_order}
                current = None
                heading_re = re.compile(r"^\*\*(.+?):\*\*")
                for raw in lines2:
                    m = heading_re.match(raw.strip())
                    if m:
                        name = m.group(1).strip().lower()
                        name = alias_map.get(name, name.title())
                        # If not one of our canonical names, coerce to title-cased string
                        if name not in sections:
                            # Map to closest fallback
                            name = alias_map.get(name.lower(), "Summary")
                            if name not in sections:
                                name = "Summary"
                        current = name
                        continue
                    if current is None:
                        # Pre-heading text goes into Summary
                        current = "Summary"
                    s = raw.rstrip()
                    if not s.strip():
                        continue
                    # Remove solitary numbering lines
                    if re.match(r"^\s*\d+\.?\)?\s*$", s):
                        continue
                    # Ensure bullets where appropriate
                    if current.lower() in bullet_sections:
                        if not s.lstrip().startswith(('-', '•')):
                            # bullet short statements
                            sentences = re.split(r"(?<=[.!?])\s+", s.strip())
                            if len(s.strip()) < 160 or len([x for x in sentences if x]) <= 1:
                                s = "- " + s.strip()
                    sections[current].append(s)

                # Rebuild in fixed order, skipping empty sections, and dedupe bullets per section
                rebuilt: list[str] = []
                for name in section_order:
                    # dedupe while preserving order
                    seen_bul = set()
                    content_raw = [c for c in sections[name] if c.strip()]
                    content: list[str] = []
                    for c in content_raw:
                        key = c.strip().lower()
                        if key in seen_bul:
                            continue
                        seen_bul.add(key)
                        content.append(c)
                    if not content:
                        continue
                    rebuilt.append(f"**{name}:**" + ("" if name in {"Summary", "What it means", "Next steps"} else ""))
                    rebuilt.extend(content)
                out_text = "\n".join(rebuilt).strip()
                # Final aggressive clean of any duplicate Summary patterns
                out_text = re.sub(r"(?i)Summary\s*:\s*Summary\s*:\s*", "**Summary:** ", out_text)
                out_text = re.sub(r"(?i)\*\*Summary:\*\*\s*Summary\s*:\s*", "**Summary:** ", out_text)
                out_text = re.sub(r"(?i)Summary\s*:\s*\*\*Summary:\*\*\s*", "**Summary:** ", out_text)
                out_text = re.sub(r"\*\*Summary:\*\*\s*\*\*Summary:\*\*", "**Summary:**", out_text)
                # Final guard: remove any leftover digit-only lines
                out_text = re.sub(r"(?m)^\s*\d+\s*$", "", out_text)
                # Strip leading/trailing whitespace per line and collapse multi-blanks
                lines_final = [l.rstrip() for l in out_text.splitlines()]
                out_final = []
                prev_blank = False
                for l in lines_final:
                    is_blank = (l.strip() == "")
                    if is_blank and prev_blank:
                        continue
                    out_final.append(l)
                    prev_blank = is_blank
                final = "\n".join(out_final).strip()
                # FINAL CLEANUP PASS - catch any remaining issues
                # Remove any stray "Summary:" before the actual summary text
                final = re.sub(r"^\s*Summary\s*:\s*\n+", "", final, flags=re.IGNORECASE | re.MULTILINE)
                # Remove duplicate bold Summary headings in a row
                final = re.sub(r"\*\*Summary:\*\*\s*\n+\s*\*\*Summary:\*\*", "**Summary:**", final)
                final = re.sub(r"\*\*Summary:\*\*\s*\n+\s*Summary\s*\n", "**Summary:**\n", final, flags=re.IGNORECASE)
                # Clean up any heading followed immediately by same heading as content
                final = re.sub(r"(\*\*\w[\w\s]+:\*\*)\s*\n+\1", r"\1\n", final)
                # Remove orphan "Summary" word on its own line after heading
                final = re.sub(r"\*\*Summary:\*\*\s*\n+\s*Summary\s*\n", "**Summary:**\n", final, flags=re.IGNORECASE)
                return final
            except Exception:
                return normalized
        except Exception:
            return text
    
    def _get_medical_summarization_prompt(self, document_text: str) -> tuple[str, str]:
        """Generate system and user prompts for medical document summarization"""
        system_prompt = """You are MediVise, a medical AI assistant specialized in simplifying complex medical documents for patients. Your role is to:

1. Transform medical jargon into plain, understandable language
2. Highlight critical information that patients need to know
3. Identify medications, dosages, and important instructions
4. Point out potential risks, side effects, or warnings
5. Provide clear, actionable information

Guidelines:
- Use simple, non-technical language (6th–8th grade), warm and calm tone
- Be empathetic and supportive; avoid formal disclaimers and sign‑offs
- Focus on what the patient needs to know and do next
- Highlight urgent or important information
- Maintain medical accuracy while being accessible
- Never provide diagnostic advice—only explain what is in the document

Format: clear, structured sections with concise bullets."""

        user_prompt = f"""Please analyze and summarize this medical document in plain language for a patient.

DOCUMENT TEXT:
{document_text}

Produce these sections in order using EXACTLY these headings (each only once):
**Summary:** 2–4 short sentences capturing the big picture.
**Findings:** 3–6 bullets from exams/labs/imaging/notes.
**What it means:** 1–3 sentences in plain language.
**Key Medications:** bullets with name, dose, and how often if present.
**Important Instructions or Precautions:** 2–6 bullets.
**Warnings or Side Effects:** 2–5 bullets.
**Red flags:** bullets of when to seek urgent care (only if present).
**Next steps:** one clear line.
**Key highlights:** 2–5 bullets of most useful points for the patient.

CRITICAL: Use each heading exactly once. Do NOT repeat headings or add extra "Summary:" lines.
Only include information present in the document; do not invent tests or treatments."""

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
            # Clean and standardize formatting consistently
            summary = self._strip_signoffs_and_labels(summary)
            summary = self._normalize_markdown(summary)
            summary = self._filter_to_source_terms(summary, document_text)
            summary = self._trim_bullets(summary, max_bullets_per_section=8)
            
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

    def _filter_to_source_terms(self, text: str, source: str) -> str:
        """Drop sentences containing suspect medical terms not present in the source text."""
        try:
            suspect_terms = [
                r"\bEEG\b",
                r"\bCT\s?angiogram\b",
                r"\bbiopsy\s+result\b",
                r"\bimmunotherapy\b",
                r"\bstem\s*cell\b",
            ]
            src_lower = (source or "").lower()
            out_lines: List[str] = []
            for line in re.split(r"(?<=[.!?])\s+", text):
                s = line.strip()
                if not s:
                    continue
                keep = True
                for pat in suspect_terms:
                    if re.search(pat, s, flags=re.IGNORECASE) and re.search(pat, src_lower, flags=re.IGNORECASE) is None:
                        keep = False
                        break
                if keep:
                    out_lines.append(s)
            return " ".join(out_lines).strip()
        except Exception:
            return text

    def _trim_bullets(self, text: str, max_bullets_per_section: int = 6) -> str:
        """Clamp number of bullets per section and trim trailing whitespace."""
        try:
            lines = text.splitlines()
            out: List[str] = []
            current_section: Optional[str] = None
            bullet_counts: Dict[str, int] = {}
            heading_re = re.compile(r"^\*\*(.+?):\*\*$")
            for ln in lines:
                m = heading_re.match(ln.strip())
                if m:
                    current_section = m.group(1).lower()
                    bullet_counts[current_section] = 0
                    out.append(ln.rstrip())
                    continue
                if ln.lstrip().startswith('- '):
                    if current_section is None:
                        out.append(ln.rstrip())
                        continue
                    if bullet_counts[current_section] < max_bullets_per_section:
                        out.append(ln.rstrip())
                        bullet_counts[current_section] += 1
                    # else: drop extra bullets silently
                    continue
                out.append(ln.rstrip())
            return "\n".join(out).strip()
        except Exception:
            return text
    
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

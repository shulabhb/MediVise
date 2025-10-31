from typing import List, Dict, Optional
import re
from .schemas_summary import DocumentSnippet

def extract_snippets(full_text: str, query: str, max_snippets: int = 5, window: int = 450) -> List[DocumentSnippet]:
    """
    Extract relevant snippets from text based on keyword matching.
    
    Args:
        full_text: Full document text
        query: Search query/keywords
        max_snippets: Maximum number of snippets to return
        window: Character window around each match
        
    Returns:
        List of DocumentSnippet objects with text and citations
    """
    # Split query into individual keywords
    keywords = re.findall(r'\b\w+\b', query.lower())
    
    if not keywords:
        return []
    
    # Create pattern that matches any of the keywords
    pattern = re.compile('|'.join(re.escape(kw) for kw in keywords), re.IGNORECASE)
    
    results = []
    seen_positions = set()
    
    for match in pattern.finditer(full_text):
        start_pos = match.start()
        
        # Skip if we've already processed this area
        if any(abs(start_pos - pos) < window for pos in seen_positions):
            continue
            
        seen_positions.add(start_pos)
        
        # Extract snippet with context window
        start = max(0, start_pos - window)
        end = min(len(full_text), match.end() + window)
        snippet_text = full_text[start:end]
        
        # Clean up snippet (remove partial words at boundaries)
        if start > 0:
            first_space = snippet_text.find(' ')
            if first_space > 0:
                snippet_text = snippet_text[first_space + 1:]
        
        if end < len(full_text):
            last_space = snippet_text.rfind(' ')
            if last_space > 0:
                snippet_text = snippet_text[:last_space]
        
        # Create citation
        citation = f"L{start}-{end}"
        
        # Calculate simple relevance score based on keyword density
        snippet_lower = snippet_text.lower()
        keyword_count = sum(snippet_lower.count(kw) for kw in keywords)
        relevance_score = keyword_count / len(keywords) if keywords else 0
        
        snippet = DocumentSnippet(
            text=snippet_text.strip(),
            citation=citation,
            relevance_score=relevance_score
        )
        
        results.append(snippet)
        
        if len(results) >= max_snippets:
            break
    
    # Sort by relevance score (highest first)
    results.sort(key=lambda x: x.relevance_score, reverse=True)
    
    return results

def _uniq_keep_order_snippets(snippets: List[DocumentSnippet]) -> List[DocumentSnippet]:
    seen = set()
    out: List[DocumentSnippet] = []
    for s in snippets:
        key = " ".join((s.text or "").lower().split())
        if key not in seen:
            seen.add(key)
            out.append(s)
    return out

def extract_snippets_by_document(documents: List[Dict], query: str, max_snippets_per_doc: int = 3) -> List[DocumentSnippet]:
    """
    Extract snippets from multiple documents.
    
    Args:
        documents: List of document dicts with 'id', 'filename', 'full_content'
        query: Search query
        max_snippets_per_doc: Max snippets per document
        
    Returns:
        List of DocumentSnippet objects from all documents
    """
    all_snippets = []
    
    for doc in documents:
        if not doc.get('full_content'):
            continue
            
        doc_snippets = extract_snippets(
            doc['full_content'], 
            query, 
            max_snippets=max_snippets_per_doc
        )
        
        # Add document context to citations
        for snippet in doc_snippets:
            snippet.citation = f"doc:{doc['id']} {snippet.citation}"
        
        all_snippets.extend(doc_snippets)
    
    # Sort all snippets by relevance
    all_snippets.sort(key=lambda x: x.relevance_score, reverse=True)

    # Enforce max 5 unique snippets globally by text
    unique = _uniq_keep_order_snippets(all_snippets)[:5]
    return unique

def extract_keywords_from_conversation(conversation_history: List[Dict]) -> List[str]:
    """
    Extract relevant keywords from conversation history for context retrieval.
    
    Args:
        conversation_history: List of message dicts with 'role' and 'content'
        
    Returns:
        List of relevant keywords
    """
    # Combine recent user messages
    recent_messages = []
    for msg in conversation_history[-6:]:  # Last 6 messages
        if msg.get('role') == 'user':
            recent_messages.append(msg.get('content', ''))
    
    combined_text = ' '.join(recent_messages)
    
    # Extract medical and important keywords
    medical_keywords = re.findall(r'\b(?:medication|drug|medicine|dose|dosage|mg|tablet|capsule|injection|prescription|allergy|side effect|contraindication|interaction|monitor|lab|test|result|diagnosis|condition|treatment|therapy|appointment|follow.?up|blood pressure|heart rate|temperature|weight|height|BMI|glucose|diabetes|hypertension|cholesterol|a1c|hemoglobin|white blood cell|red blood cell|platelet|creatinine|bun|alt|ast|ldl|hdl|triglyceride)\b', combined_text, re.IGNORECASE)
    
    # Extract other important words (nouns, adjectives)
    important_words = re.findall(r'\b(?:important|urgent|critical|severe|mild|moderate|high|low|normal|abnormal|positive|negative|increase|decrease|stable|improve|worsen|better|worse|pain|ache|symptom|sign|problem|issue|concern|question|ask|tell|explain|understand|know|remember|forget|miss|skip|take|stop|start|continue|change|adjust|modify)\b', combined_text, re.IGNORECASE)
    
    # Combine and deduplicate
    all_keywords = medical_keywords + important_words
    unique_keywords = list(set([kw.lower() for kw in all_keywords]))
    
    return unique_keywords[:10]  # Return top 10 keywords

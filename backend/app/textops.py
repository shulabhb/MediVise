from typing import List, Tuple
import re

MAX_CHARS = 3000
OVERLAP = 300

def chunk_text_with_overlap(text: str, max_chars: int = MAX_CHARS, overlap: int = OVERLAP) -> List[Tuple[int, str]]:
    """
    Split text into overlapping chunks for map-reduce processing.
    
    Args:
        text: Input text to chunk
        max_chars: Maximum characters per chunk
        overlap: Number of characters to overlap between chunks
        
    Returns:
        List of (chunk_index, chunk_text) tuples
    """
    chunks = []
    start = 0
    idx = 0
    n = len(text)
    
    while start < n:
        end = min(start + max_chars, n)
        chunk = text[start:end]
        chunks.append((idx, chunk))
        
        if end == n:
            break
            
        start = end - overlap
        idx += 1
    
    return chunks

def extract_page_anchors(text: str) -> List[str]:
    """
    Extract page references from text for citation purposes.
    Looks for patterns like "Page 3", "p. 5", etc.
    """
    patterns = [
        r'page\s+(\d+)',
        r'p\.?\s*(\d+)',
        r'pg\.?\s*(\d+)',
    ]
    
    anchors = []
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            page_num = match.group(1)
            anchors.append(f"p{page_num}")
    
    return list(set(anchors))  # Remove duplicates

def estimate_line_numbers(text: str, chunk_start: int = 0) -> str:
    """
    Estimate line numbers for a text chunk based on character position.
    Assumes ~80 characters per line.
    """
    chars_per_line = 80
    start_line = chunk_start // chars_per_line + 1
    end_line = (chunk_start + len(text)) // chars_per_line + 1
    return f"L{start_line}-{end_line}"

def deidentify_phi(text: str) -> Tuple[str, bool]:
    """
    Basic PHI de-identification using regex patterns.
    
    Returns:
        Tuple of (deidentified_text, redactions_applied)
    """
    redactions_applied = False
    
    # Common PHI patterns
    patterns = [
        # Names (basic pattern - could be more sophisticated)
        (r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', '[REDACTED_NAME]'),
        # Phone numbers
        (r'\b\d{3}-\d{3}-\d{4}\b', '[REDACTED_PHONE]'),
        (r'\(\d{3}\)\s*\d{3}-\d{4}', '[REDACTED_PHONE]'),
        # SSN
        (r'\b\d{3}-\d{2}-\d{4}\b', '[REDACTED_SSN]'),
        # Email
        (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[REDACTED_EMAIL]'),
        # Address patterns (basic)
        (r'\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b', '[REDACTED_ADDRESS]'),
        # MRN/Patient ID patterns
        (r'\bMRN:?\s*\d+\b', '[REDACTED_MRN]'),
        (r'\bPatient ID:?\s*\d+\b', '[REDACTED_PATIENT_ID]'),
    ]
    
    deidentified_text = text
    for pattern, replacement in patterns:
        if re.search(pattern, deidentified_text):
            redactions_applied = True
            deidentified_text = re.sub(pattern, replacement, deidentified_text)
    
    return deidentified_text, redactions_applied

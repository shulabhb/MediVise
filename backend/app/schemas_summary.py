from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class SummarySection(BaseModel):
    title: str
    bullets: List[str]
    citations: List[str] = Field(default_factory=list)  # e.g., ["p3:L120-145"]

class RiskFlag(BaseModel):
    code: str  # e.g., "MED-DRUG-INTERACTION"
    severity: Literal["low", "medium", "high"]
    rationale: str
    citations: List[str] = Field(default_factory=list)

class SummaryResponse(BaseModel):
    doc_id: Optional[int] = None
    style: str  # "clinical"|"patient-friendly"|"insurance-appeal" etc.
    sections: List[SummarySection]
    risks: List[RiskFlag] = Field(default_factory=list)
    redactions_applied: bool = False

class SummaryRequest(BaseModel):
    style: Literal["clinical", "patient-friendly", "insurance-appeal"] = "patient-friendly"
    include_risks: bool = True
    max_sections: int = 8

class ChatResponse(BaseModel):
    answer: str
    citations: List[str] = Field(default_factory=list)  # e.g., ["doc:3 p2:L100-130"]
    context_used: bool = False
    model_used: str
    timestamp: str

class DocumentSnippet(BaseModel):
    text: str
    citation: str  # e.g., "doc:1 p2:L100-130"
    relevance_score: float = 0.0

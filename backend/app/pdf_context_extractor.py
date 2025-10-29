"""
PDF Context Extraction Service
Extracts structured medical information from PDF documents for memory building.
"""

import re
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class PDFContextExtractor:
    """
    Extracts structured medical context from PDF text.
    Uses pattern matching and NLP techniques to identify key medical information.
    """
    
    def __init__(self):
        # Medical patterns for extraction
        self.medication_patterns = [
            r'(?i)(?:medication|drug|prescription|rx)[\s:]*([^\n]+)',
            r'(?i)(\w+)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units?)\s*(?:daily|twice daily|tid|bid|qid|prn)',
            r'(?i)(?:take|taking|prescribed)\s+([^,\n]+)',
        ]
        
        self.condition_patterns = [
            r'(?i)(?:diagnosis|condition|problem)[\s:]*([^\n]+)',
            r'(?i)(?:history of|h/o)\s+([^,\n]+)',
            r'(?i)(?:suffering from|has|with)\s+([^,\n]+)',
        ]
        
        self.allergy_patterns = [
            r'(?i)(?:allergy|allergic to|adverse reaction)[\s:]*([^\n]+)',
            r'(?i)(?:no known allergies|nka)[\s:]*([^\n]*)',
        ]
        
        self.vital_patterns = [
            r'(?i)(?:blood pressure|bp)[\s:]*(\d+/\d+)',
            r'(?i)(?:heart rate|hr|pulse)[\s:]*(\d+)',
            r'(?i)(?:temperature|temp)[\s:]*(\d+(?:\.\d+)?)',
            r'(?i)(?:weight)[\s:]*(\d+(?:\.\d+)?)\s*(?:kg|lb|lbs)',
            r'(?i)(?:height)[\s:]*(\d+(?:\.\d+)?)\s*(?:cm|in|inches)',
        ]
        
        self.lab_patterns = [
            r'(?i)(?:glucose|blood sugar)[\s:]*(\d+(?:\.\d+)?)',
            r'(?i)(?:hemoglobin|hgb|hb)[\s:]*(\d+(?:\.\d+)?)',
            r'(?i)(?:cholesterol)[\s:]*(\d+(?:\.\d+)?)',
            r'(?i)(?:creatinine)[\s:]*(\d+(?:\.\d+)?)',
            r'(?i)(?:a1c|hba1c)[\s:]*(\d+(?:\.\d+)?)',
        ]
    
    def extract_context(self, text: str) -> Dict[str, Any]:
        """
        Extract structured medical context from PDF text.
        
        Args:
            text: Raw text from PDF
            
        Returns:
            Dictionary with extracted medical information
        """
        try:
            context = {
                'medications': self._extract_medications(text),
                'conditions': self._extract_conditions(text),
                'allergies': self._extract_allergies(text),
                'vital_signs': self._extract_vital_signs(text),
                'lab_results': self._extract_lab_results(text),
                'procedures': self._extract_procedures(text),
                'providers': self._extract_providers(text),
                'extraction_confidence': self._calculate_confidence(text),
                'extracted_at': datetime.utcnow().isoformat()
            }
            
            logger.info(f"Extracted context with {len(context['medications'])} medications, {len(context['conditions'])} conditions")
            return context
            
        except Exception as e:
            logger.error(f"Error extracting context: {e}")
            return self._get_empty_context()
    
    def _extract_medications(self, text: str) -> List[Dict[str, Any]]:
        """Extract medication information from text."""
        medications = []
        
        for pattern in self.medication_patterns:
            matches = re.finditer(pattern, text, re.MULTILINE)
            for match in matches:
                med_text = match.group(1).strip()
                if med_text and len(med_text) > 3:
                    # Parse medication details
                    med_info = self._parse_medication(med_text)
                    if med_info:
                        medications.append(med_info)
        
        # Remove duplicates
        unique_meds = []
        seen_names = set()
        for med in medications:
            if med['name'].lower() not in seen_names:
                unique_meds.append(med)
                seen_names.add(med['name'].lower())
        
        return unique_meds
    
    def _parse_medication(self, med_text: str) -> Optional[Dict[str, Any]]:
        """Parse individual medication string into structured data."""
        try:
            # Common medication parsing patterns
            patterns = [
                r'(\w+)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units?)\s*(?:daily|twice daily|tid|bid|qid|prn|as needed)',
                r'(\w+)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units?)',
                r'(\w+)\s+(?:tablet|capsule|pill)',
            ]
            
            for pattern in patterns:
                match = re.search(pattern, med_text, re.IGNORECASE)
                if match:
                    groups = match.groups()
                    return {
                        'name': groups[0].strip(),
                        'dosage': groups[1] if len(groups) > 1 else None,
                        'unit': groups[2] if len(groups) > 2 else None,
                        'frequency': self._extract_frequency(med_text),
                        'raw_text': med_text.strip()
                    }
            
            # Fallback: just extract the first word as medication name
            words = med_text.split()
            if words:
                return {
                    'name': words[0],
                    'dosage': None,
                    'unit': None,
                    'frequency': None,
                    'raw_text': med_text.strip()
                }
                
        except Exception as e:
            logger.warning(f"Error parsing medication '{med_text}': {e}")
        
        return None
    
    def _extract_frequency(self, text: str) -> Optional[str]:
        """Extract medication frequency from text."""
        freq_patterns = [
            r'(?:daily|once daily|qd)',
            r'(?:twice daily|bid)',
            r'(?:three times daily|tid)',
            r'(?:four times daily|qid)',
            r'(?:as needed|prn)',
            r'(?:weekly|monthly)',
        ]
        
        for pattern in freq_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return re.search(pattern, text, re.IGNORECASE).group(0)
        
        return None
    
    def _extract_conditions(self, text: str) -> List[Dict[str, Any]]:
        """Extract medical conditions from text."""
        conditions = []
        
        for pattern in self.condition_patterns:
            matches = re.finditer(pattern, text, re.MULTILINE)
            for match in matches:
                condition_text = match.group(1).strip()
                if condition_text and len(condition_text) > 3:
                    conditions.append({
                        'name': condition_text,
                        'raw_text': condition_text,
                        'confidence': 0.8
                    })
        
        # Remove duplicates
        unique_conditions = []
        seen_names = set()
        for condition in conditions:
            if condition['name'].lower() not in seen_names:
                unique_conditions.append(condition)
                seen_names.add(condition['name'].lower())
        
        return unique_conditions
    
    def _extract_allergies(self, text: str) -> List[Dict[str, Any]]:
        """Extract allergy information from text."""
        allergies = []
        
        for pattern in self.allergy_patterns:
            matches = re.finditer(pattern, text, re.MULTILINE)
            for match in matches:
                allergy_text = match.group(1).strip()
                if allergy_text and len(allergy_text) > 2:
                    allergies.append({
                        'allergen': allergy_text,
                        'raw_text': allergy_text,
                        'severity': 'unknown'
                    })
        
        return allergies
    
    def _extract_vital_signs(self, text: str) -> Dict[str, Any]:
        """Extract vital signs from text."""
        vitals = {}
        
        for pattern in self.vital_patterns:
            matches = re.finditer(pattern, text, re.MULTILINE)
            for match in matches:
                value = match.group(1)
                if 'blood pressure' in match.group(0).lower():
                    vitals['blood_pressure'] = value
                elif 'heart rate' in match.group(0).lower():
                    vitals['heart_rate'] = value
                elif 'temperature' in match.group(0).lower():
                    vitals['temperature'] = value
                elif 'weight' in match.group(0).lower():
                    vitals['weight'] = value
                elif 'height' in match.group(0).lower():
                    vitals['height'] = value
        
        return vitals
    
    def _extract_lab_results(self, text: str) -> Dict[str, Any]:
        """Extract lab results from text."""
        labs = {}
        
        for pattern in self.lab_patterns:
            matches = re.finditer(pattern, text, re.MULTILINE)
            for match in matches:
                value = match.group(1)
                if 'glucose' in match.group(0).lower():
                    labs['glucose'] = value
                elif 'hemoglobin' in match.group(0).lower():
                    labs['hemoglobin'] = value
                elif 'cholesterol' in match.group(0).lower():
                    labs['cholesterol'] = value
                elif 'creatinine' in match.group(0).lower():
                    labs['creatinine'] = value
                elif 'a1c' in match.group(0).lower():
                    labs['a1c'] = value
        
        return labs
    
    def _extract_procedures(self, text: str) -> List[Dict[str, Any]]:
        """Extract medical procedures from text."""
        procedures = []
        
        procedure_patterns = [
            r'(?i)(?:procedure|surgery|operation)[\s:]*([^\n]+)',
            r'(?i)(?:performed|done|completed)[\s:]*([^\n]+)',
        ]
        
        for pattern in procedure_patterns:
            matches = re.finditer(pattern, text, re.MULTILINE)
            for match in matches:
                procedure_text = match.group(1).strip()
                if procedure_text and len(procedure_text) > 3:
                    procedures.append({
                        'name': procedure_text,
                        'raw_text': procedure_text
                    })
        
        return procedures
    
    def _extract_providers(self, text: str) -> List[Dict[str, Any]]:
        """Extract healthcare providers from text."""
        providers = []
        
        provider_patterns = [
            r'(?i)(?:dr\.|doctor|physician|provider)[\s:]*([A-Z][a-z]+ [A-Z][a-z]+)',
            r'(?i)(?:nurse|rn)[\s:]*([A-Z][a-z]+ [A-Z][a-z]+)',
        ]
        
        for pattern in provider_patterns:
            matches = re.finditer(pattern, text, re.MULTILINE)
            for match in matches:
                provider_name = match.group(1).strip()
                if provider_name:
                    providers.append({
                        'name': provider_name,
                        'type': 'doctor' if 'dr' in match.group(0).lower() else 'nurse'
                    })
        
        return providers
    
    def _calculate_confidence(self, text: str) -> float:
        """Calculate confidence score for extraction based on text quality."""
        if not text or len(text) < 100:
            return 0.3
        
        # Check for medical terminology
        medical_terms = ['medication', 'diagnosis', 'treatment', 'patient', 'doctor', 'blood pressure', 'heart rate']
        term_count = sum(1 for term in medical_terms if term.lower() in text.lower())
        
        # Check for structured format
        structured_indicators = [':', ';', '\n', '•', '-']
        structure_score = sum(1 for char in structured_indicators if char in text) / len(text)
        
        # Combine scores
        confidence = min(0.9, 0.3 + (term_count * 0.1) + (structure_score * 0.3))
        return round(confidence, 2)
    
    def _get_empty_context(self) -> Dict[str, Any]:
        """Return empty context structure."""
        return {
            'medications': [],
            'conditions': [],
            'allergies': [],
            'vital_signs': {},
            'lab_results': {},
            'procedures': [],
            'providers': [],
            'extraction_confidence': 0.0,
            'extracted_at': datetime.utcnow().isoformat()
        }

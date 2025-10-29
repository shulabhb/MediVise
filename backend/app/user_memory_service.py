"""
User Memory Management Service
Lightweight, fast, and cost-effective user memory system for personalized AI interactions.
"""

import json
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
import logging

from .models_memory import UserMemory, DocumentContext, MemoryInteraction
from .pdf_context_extractor import PDFContextExtractor

logger = logging.getLogger(__name__)

class UserMemoryService:
    """
    Manages user memories for personalized AI interactions.
    Uses semantic keys and confidence scoring for efficient retrieval.
    """
    
    def __init__(self):
        self.context_extractor = PDFContextExtractor()
        
        # Memory categories for organization
        self.categories = {
            'medications': ['medication', 'drug', 'prescription', 'medicine'],
            'conditions': ['condition', 'diagnosis', 'disease', 'illness', 'problem'],
            'allergies': ['allergy', 'allergic', 'adverse reaction'],
            'preferences': ['prefer', 'like', 'dislike', 'avoid'],
            'vitals': ['blood pressure', 'heart rate', 'temperature', 'weight', 'height'],
            'labs': ['glucose', 'cholesterol', 'hemoglobin', 'creatinine', 'a1c'],
            'providers': ['doctor', 'physician', 'nurse', 'provider'],
            'procedures': ['procedure', 'surgery', 'operation', 'treatment'],
            'general': ['general', 'other', 'misc']
        }
    
    async def extract_and_store_document_context(self, db: Session, user_id: str, document_id: int, text: str) -> DocumentContext:
        """
        Extract context from PDF and store it for memory building.
        
        Args:
            db: Database session
            user_id: Firebase UID
            document_id: Document ID
            text: PDF text content
            
        Returns:
            DocumentContext object
        """
        try:
            # Extract context from PDF
            context_data = self.context_extractor.extract_context(text)
            
            # Create or update document context
            doc_context = db.query(DocumentContext).filter(
                DocumentContext.user_id == user_id,
                DocumentContext.document_id == document_id
            ).first()
            
            if not doc_context:
                doc_context = DocumentContext(
                    user_id=user_id,
                    document_id=document_id,
                    extraction_confidence=context_data['extraction_confidence']
                )
                db.add(doc_context)
            
            # Update context data
            doc_context.medications = context_data['medications']
            doc_context.conditions = context_data['conditions']
            doc_context.allergies = context_data['allergies']
            doc_context.vital_signs = context_data['vital_signs']
            doc_context.lab_results = context_data['lab_results']
            doc_context.procedures = context_data['procedures']
            doc_context.providers = context_data['providers']
            doc_context.extraction_confidence = context_data['extraction_confidence']
            doc_context.last_extracted = datetime.utcnow()
            
            db.commit()
            db.refresh(doc_context)
            
            # Build memories from extracted context
            await self._build_memories_from_context(db, user_id, doc_context)
            
            logger.info(f"Extracted context for user {user_id}, document {document_id}")
            return doc_context
            
        except Exception as e:
            logger.error(f"Error extracting document context: {e}")
            db.rollback()
            raise
    
    async def _build_memories_from_context(self, db: Session, user_id: str, doc_context: DocumentContext):
        """Build user memories from extracted document context."""
        try:
            # Build medication memories
            if doc_context.medications:
                for med in doc_context.medications:
                    await self._create_or_update_memory(
                        db, user_id, 'medications', 
                        f"medication_{med['name'].lower()}", 
                        med, doc_context.document_id
                    )
            
            # Build condition memories
            if doc_context.conditions:
                for condition in doc_context.conditions:
                    await self._create_or_update_memory(
                        db, user_id, 'conditions',
                        f"condition_{condition['name'].lower().replace(' ', '_')}",
                        condition, doc_context.document_id
                    )
            
            # Build allergy memories
            if doc_context.allergies:
                for allergy in doc_context.allergies:
                    await self._create_or_update_memory(
                        db, user_id, 'allergies',
                        f"allergy_{allergy['allergen'].lower().replace(' ', '_')}",
                        allergy, doc_context.document_id
                    )
            
            # Build vital signs memories
            if doc_context.vital_signs:
                for vital, value in doc_context.vital_signs.items():
                    await self._create_or_update_memory(
                        db, user_id, 'vitals',
                        f"vital_{vital}",
                        {'value': value, 'unit': self._get_vital_unit(vital)},
                        doc_context.document_id
                    )
            
            # Build lab result memories
            if doc_context.lab_results:
                for lab, value in doc_context.lab_results.items():
                    await self._create_or_update_memory(
                        db, user_id, 'labs',
                        f"lab_{lab}",
                        {'value': value, 'unit': self._get_lab_unit(lab)},
                        doc_context.document_id
                    )
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Error building memories from context: {e}")
            db.rollback()
            raise
    
    async def _create_or_update_memory(self, db: Session, user_id: str, category: str, key: str, value: Any, source: str):
        """Create or update a user memory."""
        try:
            # Check if memory exists
            memory = db.query(UserMemory).filter(
                UserMemory.user_id == user_id,
                UserMemory.category == category,
                UserMemory.key == key
            ).first()
            
            if memory:
                # Update existing memory
                memory.value = json.dumps(value)
                memory.confidence = min(1.0, memory.confidence + 0.1)  # Increase confidence
                memory.last_updated = datetime.utcnow()
                memory.source = source
            else:
                # Create new memory
                memory = UserMemory(
                    user_id=user_id,
                    category=category,
                    key=key,
                    value=json.dumps(value),
                    confidence=0.8,
                    source=source
                )
                db.add(memory)
            
            # Log interaction
            interaction = MemoryInteraction(
                user_id=user_id,
                memory_id=memory.id if memory.id else 0,  # Will be updated after commit
                interaction_type='created' if not memory.id else 'updated',
                context=f"Document context extraction from document {source}"
            )
            db.add(interaction)
            
        except Exception as e:
            logger.error(f"Error creating/updating memory: {e}")
            raise
    
    async def learn_from_chat(self, db: Session, user_id: str, user_message: str, ai_response: str, context: Dict[str, Any] = None):
        """
        Learn from chat interactions to build user memories.
        
        Args:
            db: Database session
            user_id: Firebase UID
            user_message: User's message
            ai_response: AI's response
            context: Additional context (documents used, etc.)
        """
        try:
            # Extract learnable information from the conversation
            learnings = self._extract_learnings_from_chat(user_message, ai_response, context)
            
            for learning in learnings:
                await self._create_or_update_memory(
                    db, user_id, learning['category'], 
                    learning['key'], learning['value'], 'chat_interaction'
                )
            
            db.commit()
            logger.info(f"Learned {len(learnings)} new facts from chat for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error learning from chat: {e}")
            db.rollback()
            raise
    
    def _extract_learnings_from_chat(self, user_message: str, ai_response: str, context: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Extract learnable information from chat interaction."""
        learnings = []
        
        # Extract medication mentions
        med_patterns = [
            r'(?:i take|i\'m taking|my medication is|i use)\s+([^,\n]+)',
            r'(?:prescribed|given)\s+([^,\n]+)',
        ]
        
        for pattern in med_patterns:
            matches = re.finditer(pattern, user_message.lower())
            for match in matches:
                med_text = match.group(1).strip()
                if med_text:
                    learnings.append({
                        'category': 'medications',
                        'key': f"medication_{med_text.lower().replace(' ', '_')}",
                        'value': {'name': med_text, 'source': 'user_statement'}
                    })
        
        # Extract condition mentions
        condition_patterns = [
            r'(?:i have|i\'ve been diagnosed with|i suffer from)\s+([^,\n]+)',
            r'(?:my condition is|i\'m dealing with)\s+([^,\n]+)',
        ]
        
        for pattern in condition_patterns:
            matches = re.finditer(pattern, user_message.lower())
            for match in matches:
                condition_text = match.group(1).strip()
                if condition_text:
                    learnings.append({
                        'category': 'conditions',
                        'key': f"condition_{condition_text.lower().replace(' ', '_')}",
                        'value': {'name': condition_text, 'source': 'user_statement'}
                    })
        
        # Extract preferences
        preference_patterns = [
            r'(?:i prefer|i like|i don\'t like|i avoid)\s+([^,\n]+)',
            r'(?:i\'m allergic to|i can\'t take)\s+([^,\n]+)',
        ]
        
        for pattern in preference_patterns:
            matches = re.finditer(pattern, user_message.lower())
            for match in matches:
                pref_text = match.group(1).strip()
                if pref_text:
                    learnings.append({
                        'category': 'preferences',
                        'key': f"preference_{pref_text.lower().replace(' ', '_')}",
                        'value': {'preference': pref_text, 'source': 'user_statement'}
                    })
        
        return learnings
    
    async def get_relevant_memories(self, db: Session, user_id: str, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieve relevant memories for a query.
        
        Args:
            db: Database session
            user_id: Firebase UID
            query: Search query
            limit: Maximum number of memories to return
            
        Returns:
            List of relevant memories
        """
        try:
            # Determine relevant categories based on query
            relevant_categories = self._get_relevant_categories(query)
            
            # Build search conditions
            conditions = [UserMemory.user_id == user_id, UserMemory.is_active == True]
            
            if relevant_categories:
                conditions.append(UserMemory.category.in_(relevant_categories))
            
            # Search for memories
            memories = db.query(UserMemory).filter(
                and_(*conditions)
            ).order_by(
                desc(UserMemory.confidence),
                desc(UserMemory.access_count),
                desc(UserMemory.last_updated)
            ).limit(limit).all()
            
            # Update access counts
            for memory in memories:
                memory.access_count += 1
                interaction = MemoryInteraction(
                    user_id=user_id,
                    memory_id=memory.id,
                    interaction_type='accessed',
                    context=f"Query: {query}"
                )
                db.add(interaction)
            
            db.commit()
            
            # Format memories for return
            formatted_memories = []
            for memory in memories:
                try:
                    value = json.loads(memory.value)
                except json.JSONDecodeError:
                    value = memory.value
                
                formatted_memories.append({
                    'id': memory.id,
                    'category': memory.category,
                    'key': memory.key,
                    'value': value,
                    'confidence': memory.confidence,
                    'source': memory.source,
                    'last_updated': memory.last_updated.isoformat()
                })
            
            return formatted_memories
            
        except Exception as e:
            logger.error(f"Error retrieving memories: {e}")
            return []
    
    def _get_relevant_categories(self, query: str) -> List[str]:
        """Determine relevant memory categories based on query."""
        query_lower = query.lower()
        relevant_categories = []
        
        for category, keywords in self.categories.items():
            if any(keyword in query_lower for keyword in keywords):
                relevant_categories.append(category)
        
        # Always include general category
        if 'general' not in relevant_categories:
            relevant_categories.append('general')
        
        return relevant_categories
    
    def _get_vital_unit(self, vital: str) -> str:
        """Get appropriate unit for vital sign."""
        units = {
            'blood_pressure': 'mmHg',
            'heart_rate': 'bpm',
            'temperature': '°F',
            'weight': 'lbs',
            'height': 'in'
        }
        return units.get(vital, '')
    
    def _get_lab_unit(self, lab: str) -> str:
        """Get appropriate unit for lab result."""
        units = {
            'glucose': 'mg/dL',
            'hemoglobin': 'g/dL',
            'cholesterol': 'mg/dL',
            'creatinine': 'mg/dL',
            'a1c': '%'
        }
        return units.get(lab, '')
    
    async def get_user_memory_summary(self, db: Session, user_id: str) -> Dict[str, Any]:
        """Get a summary of user's memories for context."""
        try:
            memories = db.query(UserMemory).filter(
                UserMemory.user_id == user_id,
                UserMemory.is_active == True
            ).all()
            
            summary = {
                'total_memories': len(memories),
                'categories': {},
                'recent_activity': [],
                'confidence_distribution': {'high': 0, 'medium': 0, 'low': 0}
            }
            
            for memory in memories:
                # Count by category
                if memory.category not in summary['categories']:
                    summary['categories'][memory.category] = 0
                summary['categories'][memory.category] += 1
                
                # Confidence distribution
                if memory.confidence >= 0.8:
                    summary['confidence_distribution']['high'] += 1
                elif memory.confidence >= 0.5:
                    summary['confidence_distribution']['medium'] += 1
                else:
                    summary['confidence_distribution']['low'] += 1
            
            # Recent activity (last 7 days)
            week_ago = datetime.utcnow() - timedelta(days=7)
            recent_memories = [m for m in memories if m.last_updated >= week_ago]
            summary['recent_activity'] = len(recent_memories)
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting memory summary: {e}")
            return {'total_memories': 0, 'categories': {}, 'recent_activity': 0, 'confidence_distribution': {'high': 0, 'medium': 0, 'low': 0}}

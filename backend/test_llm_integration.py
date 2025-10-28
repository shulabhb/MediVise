#!/usr/bin/env python3
"""
Test script for MediVise LLM integration
Tests the medical AI service with sample medical text
"""

import asyncio
import sys
import os

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.llm_service import MedicalLLMService

# Sample medical document text for testing
SAMPLE_MEDICAL_TEXT = """
PATIENT: John Doe
DATE: October 21, 2024
PHYSICIAN: Dr. Sarah Johnson

CHIEF COMPLAINT: Chest pain and shortness of breath

HISTORY OF PRESENT ILLNESS:
The patient is a 45-year-old male who presents with acute onset chest pain that started 2 hours ago. The pain is described as crushing, substernal, and radiates to the left arm. Associated symptoms include shortness of breath, diaphoresis, and nausea. The patient has a history of hypertension and hyperlipidemia.

MEDICATIONS:
- Lisinopril 10mg daily for hypertension
- Atorvastatin 20mg daily for cholesterol
- Aspirin 81mg daily for cardiovascular protection

ASSESSMENT AND PLAN:
1. Acute coronary syndrome - rule out myocardial infarction
   - Order EKG, cardiac enzymes, chest X-ray
   - Start on cardiac monitoring
   - Consider cardiac catheterization if indicated

2. Hypertension - well controlled on current medication
   - Continue Lisinopril 10mg daily
   - Monitor blood pressure

3. Hyperlipidemia - on statin therapy
   - Continue Atorvastatin 20mg daily
   - Recheck lipid panel in 3 months

DISCHARGE INSTRUCTIONS:
- Take all medications as prescribed
- Follow up with cardiology in 1 week
- Return to ER if chest pain worsens or new symptoms develop
- Avoid heavy lifting for 48 hours
- Call 911 for any severe chest pain

DISCLAIMER: This is a medical record. Please consult your healthcare provider for medical advice.
"""

async def test_medical_llm():
    """Test the medical LLM service with sample text"""
    print("🤖 Testing MediVise Medical LLM Integration")
    print("=" * 50)
    
    try:
        # Initialize the medical LLM service
        async with MedicalLLMService(model_name="phi4-mini") as service:
            print(f"✅ Connected to Ollama with model: {service.model_name}")
            
            # Test document summarization
            print("\n📄 Testing Document Summarization...")
            summary_result = await service.summarize_medical_document(SAMPLE_MEDICAL_TEXT)
            
            print("✅ Summary Generated Successfully!")
            print(f"📊 Model Used: {summary_result['model_used']}")
            print(f"⏰ Processed At: {summary_result['processed_at']}")
            
            print("\n📋 MEDICAL SUMMARY:")
            print("-" * 30)
            print(summary_result['summary'])
            
            if summary_result['medications']:
                print("\n💊 MEDICATIONS IDENTIFIED:")
                print("-" * 30)
                for i, med in enumerate(summary_result['medications'], 1):
                    print(f"{i}. {med['name']}: {med['details']}")
            
            if summary_result['highlights']:
                print("\n⚠️  IMPORTANT HIGHLIGHTS:")
                print("-" * 30)
                for i, highlight in enumerate(summary_result['highlights'], 1):
                    print(f"{i}. {highlight}")
            
            # Test Q&A functionality
            print("\n❓ Testing Medical Q&A...")
            test_questions = [
                "What medications is the patient taking?",
                "What is the main concern in this medical record?",
                "What should the patient do if symptoms worsen?"
            ]
            
            for question in test_questions:
                print(f"\n🔍 Question: {question}")
                qa_result = await service.answer_medical_question(SAMPLE_MEDICAL_TEXT, question)
                print(f"✅ Answer: {qa_result['answer']}")
                print("-" * 50)
            
            print("\n🎉 All tests completed successfully!")
            print("✅ MediVise Medical LLM Integration is working perfectly!")
            
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        print("🔧 Please check:")
        print("   1. Ollama is running (ollama serve)")
        print("   2. phi4-mini model is available (ollama list)")
        print("   3. No firewall blocking localhost:11434")
        return False
    
    return True

async def main():
    """Main test function"""
    print("MediVise Medical LLM Integration Test")
    print("=====================================")
    
    success = await test_medical_llm()
    
    if success:
        print("\n🚀 Ready to integrate with MediVise frontend!")
        print("Next steps:")
        print("1. Start the FastAPI backend: cd backend && python -m uvicorn app.main:app --reload")
        print("2. Start the React frontend: cd frontend && npm run dev")
        print("3. Test the AI features in the web interface")
    else:
        print("\n❌ Integration test failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

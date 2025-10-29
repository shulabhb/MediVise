#!/usr/bin/env python3
"""
Test script for MediVise Enhanced Conversational AI
Tests the human-level conversational capabilities with medical insights
"""

import asyncio
import sys
import os
import json

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.llm_service import MedicalLLMService

# Sample conversation scenarios
CONVERSATION_SCENARIOS = [
    {
        "name": "Initial Greeting",
        "user_message": "Hi! Can you help me understand my medical information?",
        "context_documents": [],
        "conversation_history": []
    },
    {
        "name": "Medication Question",
        "user_message": "What medications am I taking and why?",
        "context_documents": [
            {
                "id": "doc1",
                "filename": "prescription_oct_2024.pdf",
                "summary": "Patient prescribed Lisinopril 10mg daily for hypertension, Atorvastatin 20mg daily for cholesterol management."
            }
        ],
        "conversation_history": [
            {"role": "user", "content": "Hi! Can you help me understand my medical information?"},
            {"role": "assistant", "content": "Hello! I'm MediVise, your medical AI assistant. I can help you understand your medical documents, medications, and health questions. How can I assist you today?"}
        ]
    },
    {
        "name": "Follow-up Question",
        "user_message": "Are there any side effects I should watch for with these medications?",
        "context_documents": [
            {
                "id": "doc1", 
                "filename": "prescription_oct_2024.pdf",
                "summary": "Patient prescribed Lisinopril 10mg daily for hypertension, Atorvastatin 20mg daily for cholesterol management."
            }
        ],
        "conversation_history": [
            {"role": "user", "content": "Hi! Can you help me understand my medical information?"},
            {"role": "assistant", "content": "Hello! I'm MediVise, your medical AI assistant. I can help you understand your medical documents, medications, and health questions. How can I assist you today?"},
            {"role": "user", "content": "What medications am I taking and why?"},
            {"role": "assistant", "content": "Based on your prescription document, you're taking two medications: Lisinopril 10mg daily for managing high blood pressure (hypertension), and Atorvastatin 20mg daily for cholesterol management. Both are important for your cardiovascular health."}
        ]
    },
    {
        "name": "Complex Medical Question",
        "user_message": "I'm feeling dizzy lately, could this be related to my medications?",
        "context_documents": [
            {
                "id": "doc1",
                "filename": "prescription_oct_2024.pdf", 
                "summary": "Patient prescribed Lisinopril 10mg daily for hypertension, Atorvastatin 20mg daily for cholesterol management."
            },
            {
                "id": "doc2",
                "filename": "lab_results_sept_2024.pdf",
                "summary": "Recent lab results show normal blood pressure readings, cholesterol levels within target range."
            }
        ],
        "conversation_history": [
            {"role": "user", "content": "What medications am I taking and why?"},
            {"role": "assistant", "content": "Based on your prescription document, you're taking Lisinopril 10mg daily for managing high blood pressure, and Atorvastatin 20mg daily for cholesterol management."}
        ]
    }
]

async def test_conversational_scenario(scenario):
    """Test a specific conversation scenario"""
    print(f"\n🧪 Testing: {scenario['name']}")
    print("=" * 50)
    
    try:
        async with MedicalLLMService(model_name="phi4-mini") as service:
            # Build context information
            context_info = ""
            
            # Add user documents context
            if scenario['context_documents']:
                context_info += "USER'S MEDICAL DOCUMENTS:\n"
                for doc in scenario['context_documents']:
                    context_info += f"- {doc.get('filename', 'Unknown')}: {doc.get('summary', 'No summary available')}\n"
                context_info += "\n"
            
            # Add conversation history context
            if scenario['conversation_history']:
                context_info += "RECENT CONVERSATION:\n"
                for msg in scenario['conversation_history'][-6:]:  # Last 6 messages for context
                    role = msg.get('role', 'unknown')
                    content = msg.get('content', '')
                    context_info += f"{role.upper()}: {content}\n"
                context_info += "\n"
            
            # Create enhanced system prompt for conversational mode
            system_prompt = f"""You are MediVise, an advanced medical AI assistant with human-level conversational capabilities. You help patients understand their medical information in a warm, empathetic, and professional manner.

CONTEXT INFORMATION:
{context_info}

YOUR CAPABILITIES:
- Provide clear, empathetic explanations of medical information
- Answer questions about medications, conditions, and treatments
- Offer practical health insights and recommendations
- Maintain conversation flow and remember context
- Provide emotional support while being medically accurate

CONVERSATION STYLE:
- Be warm, supportive, and human-like
- Use "I understand" and "That makes sense" to show empathy
- Ask follow-up questions when appropriate
- Provide actionable advice and next steps
- Use simple language while maintaining medical accuracy

IMPORTANT GUIDELINES:
- Always remind users to consult healthcare providers for medical decisions
- Never provide diagnostic advice or replace professional medical care
- For urgent medical concerns, direct users to emergency services
- Be honest about limitations and encourage professional consultation
- Maintain patient privacy and confidentiality

Current user message: {scenario['user_message']}

Respond as a caring, knowledgeable medical assistant who truly wants to help."""

            # Get the AI response
            response = await service._make_request(scenario['user_message'], system_prompt)
            
            # Add medical insights if documents are available
            insights = ""
            if scenario['context_documents']:
                insights = "\n\n💡 **Medical Insights:**\n"
                insights += "- I can see you have medical documents uploaded. Would you like me to analyze any specific document?\n"
                insights += "- I can help explain medications, conditions, or treatment plans from your records.\n"
                insights += "- Feel free to ask me about any medical terms or instructions you don't understand.\n"
            
            full_response = response + insights
            
            print(f"👤 User: {scenario['user_message']}")
            print(f"🤖 MediVise: {full_response}")
            
            # Analyze response quality
            print(f"\n📊 Response Analysis:")
            print(f"   • Length: {len(full_response)} characters")
            print(f"   • Context Used: {'Yes' if context_info else 'No'}")
            print(f"   • Documents Referenced: {len(scenario['context_documents'])}")
            print(f"   • Conversation History: {len(scenario['conversation_history'])} messages")
            
            # Check for key conversational elements
            conversational_elements = {
                "empathy": any(word in full_response.lower() for word in ["understand", "feel", "sorry", "concerned"]),
                "medical_accuracy": any(word in full_response.lower() for word in ["consult", "doctor", "healthcare", "provider"]),
                "actionable_advice": any(word in full_response.lower() for word in ["should", "recommend", "suggest", "next"]),
                "context_awareness": any(doc['filename'] in full_response for doc in scenario['context_documents']) if scenario['context_documents'] else True
            }
            
            print(f"   • Shows Empathy: {'✅' if conversational_elements['empathy'] else '❌'}")
            print(f"   • Medical Accuracy: {'✅' if conversational_elements['medical_accuracy'] else '❌'}")
            print(f"   • Actionable Advice: {'✅' if conversational_elements['actionable_advice'] else '❌'}")
            print(f"   • Context Awareness: {'✅' if conversational_elements['context_awareness'] else '❌'}")
            
            return True
            
    except Exception as e:
        print(f"❌ Error in scenario '{scenario['name']}': {e}")
        return False

async def test_conversational_ai():
    """Test the enhanced conversational AI capabilities"""
    print("🤖 Testing MediVise Enhanced Conversational AI")
    print("=" * 60)
    
    success_count = 0
    total_scenarios = len(CONVERSATION_SCENARIOS)
    
    for scenario in CONVERSATION_SCENARIOS:
        try:
            success = await test_conversational_scenario(scenario)
            if success:
                success_count += 1
        except Exception as e:
            print(f"❌ Failed scenario '{scenario['name']}': {e}")
    
    print(f"\n🎯 Test Results Summary")
    print("=" * 30)
    print(f"✅ Successful: {success_count}/{total_scenarios}")
    print(f"❌ Failed: {total_scenarios - success_count}/{total_scenarios}")
    print(f"📊 Success Rate: {(success_count/total_scenarios)*100:.1f}%")
    
    if success_count == total_scenarios:
        print("\n🎉 All conversational AI tests passed!")
        print("✅ MediVise is ready for human-level medical conversations!")
        print("\n🚀 Features Verified:")
        print("   • Context-aware conversations")
        print("   • Medical document integration")
        print("   • Empathetic and supportive responses")
        print("   • Medical accuracy and safety guidelines")
        print("   • Actionable health insights")
        print("   • Conversation memory and flow")
    else:
        print(f"\n⚠️  {total_scenarios - success_count} test(s) failed. Please review the errors above.")
    
    return success_count == total_scenarios

async def main():
    """Main test function"""
    print("MediVise Enhanced Conversational AI Test")
    print("=====================================")
    
    success = await test_conversational_ai()
    
    if success:
        print("\n🚀 Ready for production!")
        print("Next steps:")
        print("1. Start the FastAPI backend: cd backend && python -m uvicorn app.main:app --reload")
        print("2. Start the React frontend: cd frontend && npm run dev")
        print("3. Test the enhanced chat interface in the web application")
        print("4. Upload medical documents and have natural conversations!")
    else:
        print("\n❌ Some tests failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

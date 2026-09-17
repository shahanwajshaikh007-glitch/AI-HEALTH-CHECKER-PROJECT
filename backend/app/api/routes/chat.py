"""
Chat Router — AI Medical Assistant using MongoDB.
"""

from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from bson import ObjectId

from app.config import settings
from app.database.mongodb import get_mongodb
from app.auth.deps import get_current_user

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    assessment_context: Optional[str] = None


def generate_medical_ai_reply(user_msg: str, context: Optional[str] = None) -> str:
    """
    Generates intelligent medical assistant response.
    Integrates Gemini API if key is set, otherwise provides structured medical AI responses.
    """
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your-gemini-api-key-here":
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = (
                "You are an empathetic, professional AI Medical Assistant. "
                "Provide accurate, helpful health information in plain language. "
                "Always include a disclaimer that you are an AI assistant and not a substitute for a doctor.\n"
            )
            if context:
                prompt += f"Recent Assessment Context: {context}\n"
            prompt += f"User Question: {user_msg}"
            res = model.generate_content(prompt)
            if res and res.text:
                return res.text.strip()
        except Exception as e:
            print(f"Gemini API call failed: {e}")

    # Knowledge-based fallback AI assistant
    msg_lower = user_msg.lower()

    if "fever" in msg_lower:
        return (
            "🌡️ **Managing Fever:**\n"
            "- Stay well-hydrated with fluids like water, warm broth, or electrolyte drinks.\n"
            "- Get plenty of rest in a cool, comfortable room.\n"
            "- Over-the-counter paracetamol/acetaminophen can help lower fever.\n\n"
            "⚠️ *Seek emergency care if fever exceeds 103°F (39.4°C), lasts >3 days, or is accompanied by stiff neck, confusion, or breathing trouble.*"
        )
    elif "cough" in msg_lower or "cold" in msg_lower:
        return (
            "😷 **Cough & Cold Relief:**\n"
            "- Honey and warm fluids (like herbal tea) can soothe throat irritation.\n"
            "- Use a steam humidifier or take a warm shower.\n"
            "- Rest to give your immune system time to recover.\n\n"
            "⚠️ *Consult a doctor if you experience difficulty breathing, chest tightness, or cough up blood.*"
        )
    elif "headache" in msg_lower or "migraine" in msg_lower:
        return (
            "🧠 **Headache Care:**\n"
            "- Rest in a quiet, dark room.\n"
            "- Apply a cool compress to your forehead.\n"
            "- Stay hydrated and avoid screen strain.\n\n"
            "⚠️ *Emergency warning: Seek immediate emergency care for sudden severe 'thunderclap' headache or headache with numbness/slurred speech.*"
        )
    elif "diet" in msg_lower or "food" in msg_lower or "nutrition" in msg_lower:
        return (
            "🥗 **General Nutritional Guidance:**\n"
            "- Eat a balanced diet rich in whole vegetables, fruits, lean protein, and fiber.\n"
            "- Drink at least 2-3 liters of water daily.\n"
            "- Limit processed sugars and sodium."
        )
    else:
        return (
            f"Hello! I am your AI Medical Assistant.\n\n"
            f"Regarding your query about *\"{user_msg}\"*:\n"
            f"• It is important to monitor your symptoms closely.\n"
            f"• Keep track of any changes in severity or duration.\n"
            f"• Ensure adequate rest and fluid intake.\n\n"
            f"💡 *Remember: This information is for educational purposes and does not replace a medical consultation with a qualified doctor.*"
        )


@router.post("", summary="Send Message to AI Medical Assistant")
async def chat_with_ai(
    body: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_mongodb)
):
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    user_id = str(current_user["id"])
    now_iso = datetime.now(timezone.utc).isoformat()

    # Find or create conversation for this user in MongoDB
    conv = db.conversations.find_one({"user_id": user_id})
    if not conv:
        conv_res = db.conversations.insert_one({
            "user_id": user_id,
            "title": "Health Consultation",
            "created_at": now_iso
        })
        conv_id = str(conv_res.inserted_id)
    else:
        conv_id = str(conv["_id"])

    # Save user message
    db.messages.insert_one({
        "conversation_id": conv_id,
        "user_id": user_id,
        "sender": "user",
        "message": body.message.strip(),
        "created_at": now_iso
    })

    # Generate AI response
    ai_reply_text = generate_medical_ai_reply(body.message, body.assessment_context)
    ai_now_iso = datetime.now(timezone.utc).isoformat()

    # Save AI response
    db.messages.insert_one({
        "conversation_id": conv_id,
        "user_id": user_id,
        "sender": "ai",
        "message": ai_reply_text,
        "created_at": ai_now_iso
    })

    return {
        "reply": ai_reply_text,
        "sender": "ai",
        "timestamp": ai_now_iso
    }


@router.get("/history", summary="Get Chat Conversation History")
async def get_chat_history(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_mongodb)
):
    user_id = str(current_user["id"])
    conv = db.conversations.find_one({"user_id": user_id})
    if not conv:
        return {"messages": []}

    conv_id = str(conv["_id"])
    messages = list(db.messages.find({"conversation_id": conv_id, "user_id": user_id}).sort("created_at", 1))

    return {
        "messages": [
            {
                "id": str(m["_id"]),
                "sender": m.get("sender"),
                "message": m.get("message"),
                "created_at": m.get("created_at")
            }
            for m in messages
        ]
    }


@router.delete("/history", summary="Clear Chat History")
@router.delete("/{conversation_id}", summary="Delete conversation by ID")
async def clear_chat_history(
    conversation_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_mongodb)
):
    user_id = str(current_user["id"])
    conv = db.conversations.find_one({"user_id": user_id})
    if conv:
        conv_id = str(conv["_id"])
        db.messages.delete_many({"conversation_id": conv_id, "user_id": user_id})
        db.conversations.delete_one({"_id": conv["_id"]})

    return {"message": "Chat history cleared successfully."}

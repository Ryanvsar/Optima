import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter(prefix="/tts", tags=["tts"])


class SpeakRequest(BaseModel):
    text: str


@router.post("/speak")
def speak(payload: SpeakRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="TTS service not configured")

    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    # Truncate to 4096 chars (OpenAI TTS limit)
    text = text[:4096]

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        response = client.audio.speech.create(
            model="tts-1",
            voice="nova",
            input=text,
        )
        audio_bytes = response.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"TTS error: {str(e)}")

    return StreamingResponse(
        iter([audio_bytes]),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache"},
    )

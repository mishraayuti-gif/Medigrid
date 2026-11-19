from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
from modules.posture_analyzer import PostureRuleAnalyzer, MEDIAPIPE_AVAILABLE
from modules.ollama_client import check_ollama, chat_ollama

app = FastAPI(title="MindCare AI Vision & LLM Microservice", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = PostureRuleAnalyzer()


class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]


@app.get("/health")
async def health():
    ollama_status = await check_ollama()
    return {
        "status": "ok",
        "mediapipeAvailable": MEDIAPIPE_AVAILABLE,
        "ollama": ollama_status,
    }


@app.post("/posture/analyze-frame")
async def analyze_posture_frame(
    file: UploadFile = File(...),
    ruleKey: str = Form("upright_alignment"),
):
    """
    Processes a transient video frame in memory without persisting or storing video.
    """
    raw_bytes = await file.read()
    result = analyzer.analyze_image_bytes(raw_bytes, ruleKey)
    return result


@app.post("/ai/chat")
async def ai_chat(payload: ChatRequest):
    return await chat_ollama(payload.messages)

import os
from typing import List, Dict, Any
import httpx

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")


async def check_ollama() -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            models = [m.get("name") for m in data.get("models", [])]
            return {"available": True, "model": OLLAMA_MODEL, "models": models}
    except Exception as exc:
        return {"available": False, "model": OLLAMA_MODEL, "error": str(exc)}


async def chat_ollama(messages: List[Dict[str, str]]) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={"model": OLLAMA_MODEL, "messages": messages, "stream": False},
            )
            resp.raise_for_status()
            data = resp.json()
            return {"available": True, "reply": data.get("message", {}).get("content", "")}
    except Exception as exc:
        return {"available": False, "error": str(exc), "reply": None}

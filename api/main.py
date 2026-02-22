"""
main.py — FastAPI backend for CSCP Situational AI
Provides contextual supply chain guidance using EPUB module content + OpenRouter API.
"""

import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from epub_loader import load_all_modules, search_relevant_chunks
from contextlib import asynccontextmanager

OPENROUTER_API_KEY = "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"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_PROMPT = """You are Aria, a world-class supply chain expert advisor with deep expertise in ASCM CSCP frameworks, logistics, procurement, inventory management, demand planning, and global operations strategy.

You are speaking with a supply chain professional who is facing a real-world operational challenge. Your role is to provide:
- Immediate, practical, actionable guidance
- Best practices grounded in ASCM CSCP standards and frameworks
- Clear step-by-step recommendations
- Industry-standard professional advice

Your tone is calm, authoritative, empathetic, and professional — like a senior consultant at a Fortune 500 company. Always structure your response clearly with bold headers when appropriate. Focus on what can be DONE RIGHT NOW and what to plan for the near and long term.

Base your advice on the CSCP module content provided in the context. If the context is not fully relevant, still provide professional supply chain guidance based on your expert knowledge."""


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load EPUB modules on startup."""
    print("[API] Loading EPUB modules...")
    load_all_modules()
    print("[API] Ready.")
    yield


app = FastAPI(title="CSCP Situational AI API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str
    history: list[dict] = []


class QueryResponse(BaseModel):
    answer: str
    sources: list[str] = []


@app.get("/")
async def root():
    return {"status": "ok", "message": "CSCP Situational AI API is running."}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/situational-ai", response_model=QueryResponse)
async def situational_ai(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # Retrieve relevant context from EPUB modules
    relevant_chunks = search_relevant_chunks(req.question, top_n=5)
    context_text = "\n\n---\n\n".join(relevant_chunks) if relevant_chunks else "No specific module content found."

    # Build messages
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"""## CSCP Module Context (Relevant Excerpts):
{context_text}

---

## Situation / Question from Supply Chain Professional:
{req.question}

Please provide expert, actionable guidance."""
        }
    ]

    # Add conversation history (last 4 exchanges for context)
    if req.history:
        recent = req.history[-8:]
        messages = [messages[0]] + recent + [messages[-1]]

    # Call OpenRouter API
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5050",
                    "X-Title": "CSCP Situational AI"
                },
                json={
                    "model": "openai/gpt-4o-mini",
                    "messages": messages,
                    "max_tokens": 1024,
                    "temperature": 0.7
                }
            )
            response.raise_for_status()
            data = response.json()
            answer = data["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    # Extract source module references
    sources = list(set([
        f"Module {c.split(']')[0].split('[Module ')[1]}"
        for c in relevant_chunks if "[Module " in c
    ]))

    return QueryResponse(answer=answer, sources=sources)

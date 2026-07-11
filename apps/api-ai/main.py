from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import search, recommend, chatbot

app = FastAPI(title="WithYou AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/search", tags=["search"])
app.include_router(recommend.router, prefix="/recommend", tags=["recommend"])
app.include_router(chatbot.router, prefix="/chat", tags=["chatbot"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "withyou-ai"}

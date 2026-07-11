from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.schemas import ChatRequest
from app.services.llama_service import get_index

router = APIRouter()


def _stream_answer(question: str):
    query_engine = get_index().as_query_engine(streaming=True)
    response = query_engine.query(question)
    for token in response.response_gen:
        yield token


@router.post("")
def chat(body: ChatRequest):
    last_message = body.messages[-1].content if body.messages else ""
    return StreamingResponse(_stream_answer(last_message), media_type="text/event-stream")

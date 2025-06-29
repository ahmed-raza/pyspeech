from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os, alog

load_dotenv()

FRONTEND = os.getenv('NEXT_PUBLIC_APP_URL')

alog.info(f"Frontend: {FRONTEND}")


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/')
async def root():
    return "Connects"

@app.websocket('/ws')
async def handle_websocket(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Message received was: {data}")
    except Exception as e:
        alog.error(f"Error occured: {e}")
    finally:
        alog.info("Connection closed.")
        await websocket.close()

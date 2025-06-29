@echo off
call .\venv\Scripts\activate
uvicorn speech.app:app --reload

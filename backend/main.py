from fastapi import FastAPI
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv
import motor.motor_asyncio
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

# 1. AI Setup
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

# 2. MongoDB Setup
mongo_url = os.getenv("MONGODB_URL")
client = None
collection = None

if mongo_url:
    try:
        client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
        db = client.codeguard_db
        collection = db.audits
    except Exception as e:
        print(f"MongoDB Init Error: {e}")

app = FastAPI(title="CodeGuard API")

# CORS CONFIGURATION
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "CodeGuard is active!"}

class CodeRequest(BaseModel):
    code: str

@app.post("/analyze")
async def analyze_code(request: CodeRequest):
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"Act as a Senior Security Engineer. Review this code for vulnerabilities and give a brief audit report in Markdown format:\n\n{request.code}"
        
        response = model.generate_content(prompt)
        audit_text = response.text

        if collection is not None:
            audit_entry = {
                "code_submitted": request.code,
                "audit_report": audit_text,
                "timestamp": datetime.utcnow()
            }
            await collection.insert_one(audit_entry)

        return {
            "audit_report": audit_text, 
            "db_status": "Logged to cloud archive" if collection is not None else "AI analysis complete (DB offline)"
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/history")
async def get_history():
    if collection is None:
        return {"history": []}
    try:
        cursor = collection.find().sort("timestamp", -1).limit(10)
        past_audits = []
        async for doc in cursor:
            past_audits.append({
                "id": str(doc["_id"]),
                "code": doc["code_submitted"],
                "report": doc["audit_report"],
                "time": doc["timestamp"].isoformat() if "timestamp" in doc else "Unknown"
            })
        return {"history": past_audits}
    except Exception as e:
        return {"error": str(e)}

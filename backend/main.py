from fastapi import FastAPI
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv
import motor.motor_asyncio
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv(override=True)

app = FastAPI(title="CodeGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        print("Connected to DB")
    except Exception as e:
        print(f"Database connection error: {e}")

@app.get("/")
async def root():
    return {"message": "CodeGuard is active!"}

class CodeRequest(BaseModel):
    code: str

@app.post("/analyze")
async def analyze_code(request: CodeRequest):
    try:
        # Using the working 2.5-flash model
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = f"Act as a Senior Security Engineer. Review this code for vulnerabilities and give a brief audit report in Markdown format:\n\n{request.code}"
        
        response = model.generate_content(prompt)
        audit_text = response.text

        # Standardized the database insertion keys
        if collection is not None:
            audit_entry = {
                "code": request.code,
                "report": audit_text,
                "timestamp": datetime.utcnow()
            }
            await collection.insert_one(audit_entry)

        return {
            "audit_report": audit_text, 
            "db_status": "Successfully logged to cloud archive" if collection is not None else "Analysis complete (DB bypass)"
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
            # FIXED: Force fallback text if the old database records used different keys or were empty
            code_text = doc.get("code") or doc.get("code_submitted") or "// [Empty Legacy Record]"
            report_text = doc.get("report") or doc.get("audit_report") or "No audit report found for this legacy record."
            
            past_audits.append({
                "id": str(doc["_id"]),
                "code": str(code_text),
                "report": str(report_text),
                "time": doc.get("timestamp").isoformat() if doc.get("timestamp") else "Unknown"
            })
        return {"history": past_audits}
    except Exception as e:
        return {"error": str(e)}
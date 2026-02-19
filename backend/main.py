from fastapi import FastAPI
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv
import motor.motor_asyncio
from datetime import datetime
import sys
from fastapi.middleware.cors import CORSMiddleware  # <-- NEW: Imported CORS

# Load environment variables (override=True ensures we read the file directly)
load_dotenv(override=True)

print("\n--- CODEGUARD STARTUP SEQUENCE ---")

# 1. AI Setup
api_key = os.getenv("GEMINI_API_KEY")
if api_key and api_key != "your_actual_gemini_key_here":
    print("✅ SUCCESS: Gemini API Key found.")
    genai.configure(api_key=api_key)
else:
    print("❌ ERROR: Gemini API Key is missing or invalid in .env")

# 2. MongoDB Setup
mongo_url = os.getenv("MONGODB_URL")
if mongo_url:
    print("✅ SUCCESS: MongoDB URL found.")
    try:
        # Initialize the MongoDB client
        client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
        db = client.codeguard_db
        collection = db.audits
        print("✅ SUCCESS: MongoDB Client Initialized.")
    except Exception as e:
        print(f"❌ ERROR: Failed to initialize MongoDB: {e}")
else:
    print("❌ ERROR: MONGODB_URL is missing from .env")

print("--- END STARTUP SEQUENCE ---\n")

# Initialize FastAPI
app = FastAPI(
    title="CodeGuard API",
    description="Backend for the CodeGuard Automated Security Tool"
)

# --- NEW: CORS CONFIGURATION ---
# This acts as the "bouncer" and allows your React frontend to talk to the Python backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows requests from any website/port
    allow_credentials=True,
    allow_methods=["*"], # Allows all types of requests (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)
# -------------------------------

# Root endpoint
@app.get("/")
async def root():
    return {"message": "CodeGuard is active!"}

# Data structure for incoming code
class CodeRequest(BaseModel):
    code: str

# AI Analysis & Database Saving Endpoint
@app.post("/analyze")
async def analyze_code(request: CodeRequest):
    try:
        # 1. Ask Gemini for the report
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = f"Act as a Senior Security Engineer. Review this code for vulnerabilities and give a brief audit report:\n\n{request.code}"
        
        response = model.generate_content(prompt)
        audit_text = response.text

        # 2. Save the result to MongoDB Cloud
        audit_entry = {
            "code_submitted": request.code,
            "audit_report": audit_text,
            "timestamp": datetime.utcnow()
        }
        await collection.insert_one(audit_entry)

        # 3. Return the report AND the success message
        return {
            "audit_report": audit_text, 
            "db_status": "Successfully saved to cloud memory!"
        }
        
    except Exception as e:
        return {"error": str(e)}

# --- NEW: HISTORY ENDPOINT ---
@app.get("/history")
async def get_history():
    try:
        # Ask MongoDB for the 10 most recent audits, sorted by newest first (-1)
        cursor = collection.find().sort("timestamp", -1).limit(10)
        
        past_audits = []
        async for doc in cursor:
            past_audits.append({
                "id": str(doc["_id"]), # MongoDB IDs need to be converted to strings
                "code": doc["code_submitted"],
                "report": doc["audit_report"],
                "time": doc["timestamp"].isoformat() if "timestamp" in doc else "Unknown Time"
            })
            
        return {"history": past_audits}
    except Exception as e:
        return {"error": str(e)}
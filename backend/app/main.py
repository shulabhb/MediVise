from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from .auth import get_current_user

app = FastAPI(title="MediVise API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for demo purposes
users_db = {}

class UserCreate(BaseModel):
    username: str
    email: str
    first_name: str
    last_name: str
    date_of_birth: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None

class SOSAlert(BaseModel):
    emergency_type: str
    message: Optional[str] = None

@app.get("/health")
def read_health():
    return {"status": "ok"}

@app.get("/me")
def read_me(user = Depends(get_current_user)):
    return {"user": user}

@app.post("/users")
async def create_user(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    """Create or update user profile"""
    user_id = current_user.get("uid")
    print(f"Creating user with user_id: {user_id}")
    print(f"Username: {user_data.username}")
    
    # Check if user already exists
    if user_id in users_db:
        print(f"User {user_id} already exists, returning existing profile")
        return {"message": "User profile already exists", "user": users_db[user_id]}
    
    # Check if username is already taken
    for existing_user in users_db.values():
        if existing_user.get("username") == user_data.username and existing_user.get("uid") != user_id:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    # Store user data
    users_db[user_id] = {
        "uid": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "date_of_birth": user_data.date_of_birth,
    }
    
    print(f"User created successfully. Database now has: {list(users_db.keys())}")
    return {"message": "User profile created successfully", "user": users_db[user_id]}

@app.get("/users/me")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile"""
    user_id = current_user.get("uid")
    
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    return {"user": users_db[user_id]}

@app.put("/users/me")
async def update_user_profile(user_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Update current user's profile"""
    user_id = current_user.get("uid")
    
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    # Check if username is already taken by another user
    if user_data.username:
        for existing_user in users_db.values():
            if existing_user.get("username") == user_data.username and existing_user.get("uid") != user_id:
                raise HTTPException(status_code=400, detail="Username already taken")
    
    # Update user data
    update_data = user_data.dict(exclude_unset=True)
    users_db[user_id].update(update_data)
    
    return {"message": "User profile updated successfully", "user": users_db[user_id]}

@app.delete("/users/me")
async def delete_user_profile(current_user: dict = Depends(get_current_user)):
    """Delete current user's profile"""
    user_id = current_user.get("uid")
    
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    del users_db[user_id]
    return {"message": "User profile deleted successfully"}

@app.get("/users/check-username/{username}")
async def check_username_availability(username: str, current_user: dict = Depends(get_current_user)):
    """Check if username is available"""
    user_id = current_user.get("uid")
    
    for existing_user in users_db.values():
        if existing_user.get("username") == username and existing_user.get("uid") != user_id:
            return {"available": False, "message": "Username already taken"}
    
    return {"available": True, "message": "Username is available"}

# Public (unauthenticated) username availability check for signup preflight
@app.get("/public/check-username/{username}")
async def public_check_username_availability(username: str):
    """Check if a username is available without authentication (for signup forms)."""
    for existing_user in users_db.values():
        if existing_user.get("username") == username:
            return {"available": False, "message": "Username already taken"}
    return {"available": True, "message": "Username is available"}

@app.get("/public/resolve-username/{username}")
async def public_resolve_username(username: str):
    """Resolve a username to the corresponding email for username-based login."""
    for existing_user in users_db.values():
        if existing_user.get("username") == username:
            return {"email": existing_user.get("email", "")}
    raise HTTPException(status_code=404, detail="Username not found")

@app.post("/sos-alert")
async def send_sos_alert(alert_data: SOSAlert, current_user: dict = Depends(get_current_user)):
    """Send SOS emergency alert"""
    user_id = current_user.get("uid")
    user_email = current_user.get("email", "Unknown")
    
    # In a real application, this would send actual notifications
    # For now, we'll just log the alert
    print(f"SOS ALERT from user {user_id} ({user_email}):")
    print(f"Emergency Type: {alert_data.emergency_type}")
    print(f"Message: {alert_data.message}")
    
    # Simulate sending email notification
    alert_message = f"""
    SOS EMERGENCY ALERT
    
    User: {user_email} (ID: {user_id})
    Emergency Type: {alert_data.emergency_type}
    Message: {alert_data.message or 'No additional message'}
    Timestamp: {__import__('datetime').datetime.now().isoformat()}
    
    Please respond immediately!
    """
    
    print("Email notification would be sent:")
    print(alert_message)
    
    return {
        "message": "SOS alert sent successfully",
        "alert_id": f"sos_{user_id}_{__import__('time').time()}",
        "timestamp": __import__('datetime').datetime.now().isoformat()
    }

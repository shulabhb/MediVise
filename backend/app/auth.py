from typing import Optional
import os
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import firebase_admin
from firebase_admin import auth as fb_auth, credentials

# Load env file if present
load_dotenv()

# Initialize Firebase Admin once
if not firebase_admin._apps:
    cred_path: Optional[str] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path and os.path.isfile(cred_path):
        firebase_admin.initialize_app(credentials.Certificate(cred_path))
    else:
        # Fallback to application default credentials if available
        try:
            firebase_admin.initialize_app()
        except Exception as exc:  # noqa: BLE001
            # Leave uninitialized; verification will fail with clear error later
            pass

bearer_scheme = HTTPBearer(auto_error=False)

from typing import Optional

async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = creds.credentials
    try:
        decoded = fb_auth.verify_id_token(token)
        return decoded  # includes uid, email, etc.
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc



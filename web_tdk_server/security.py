from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from auth import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

# Dependency สำหรับตรวจสอบ token

def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    email = payload.get("sub")
    role = payload.get("role")
    school_id = payload.get("school_id")  # เพิ่มตรงนี้
    if email is None or role is None or school_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    print("email:", email, "role:", role, "school_id:", school_id)
    return {"email": email, "role": role, "school_id": school_id}

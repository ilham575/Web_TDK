from fastapi import FastAPI

# สร้าง instance ของ FastAPI
app = FastAPI()

# สร้าง endpoint สำหรับ root ("/")
@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

# สร้าง endpoint สำหรับ items
@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "query": q}
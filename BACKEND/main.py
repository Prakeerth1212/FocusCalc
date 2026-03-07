from fastapi import FastAPI,Depends,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta
import time,uuid
import subprocess
import socket
from database import sl,init_db,T,B,FS
app=FastAPI()
app.add_middleware(CORSMiddleware,allow_origins=['*'],allow_methods=['*'],allow_headers=['*'])
def get_db():
    db=sl()
    try:
        yield db
    finally:
        db.close()
init_db()
def get_hostname(url):
    url = url.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
    return url.strip()

def block_website(hostname):
    hosts_path = r"C:\Windows\System32\drivers\etc\hosts"
    try:
        block_entry = f"127.0.0.1 {hostname}\n127.0.0.1 www.{hostname}\n"
        with open(hosts_path, 'r') as f:
            content = f.read()
        if hostname not in content:
            with open(hosts_path, 'a') as f:
                f.write(block_entry)
            print(f"Blocked: {hostname}")
        else:
            print(f"Already blocked: {hostname}")
    except Exception as e:
        print(f"ERROR blocking {hostname}: {e}")

def unblock_website(hostname):
    hosts_path = r"C:\Windows\System32\drivers\etc\hosts"
    with open(hosts_path, 'r') as f:
        lines = f.readlines()
    with open(hosts_path, 'w') as f:
        for line in lines:
            if hostname not in line:
                f.write(line)

def block_app(exe_name):
    subprocess.run(["taskkill", "/F", "/IM", exe_name], capture_output=True)

class TC(BaseModel):
    name:str
    date:str
class TU(BaseModel):
    name:Optional[str]=None
    completed:Optional[bool]=None
    time_spent:Optional[int]=None
    timer_running:Optional[int]=None
    start_time:Optional[float]=None
    reason:Optional[str]=None
    rollover_count:Optional[int]=None

class BIC(BaseModel):
    name:str
    type:str
    value:str
    category:Optional[str]=None
    enabled:bool=True

@app.get('/tasks')
def get_tasks(date:Optional[str]=None,db:Session=Depends(get_db)):
    if date:
        return db.query(T).filter(T.date==date).all()
    return db.query(T).all()
@app.post('/tasks')
def create_task(task:TC,db:Session=Depends(get_db)):
    new_task=T(id=str(uuid.uuid4()),name=task.name,date=task.date)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task
@app.put('/tasks/{task_id}')
def update_task(task_id:str,updates:TU,db:Session=Depends(get_db)):
    task = db.query(T).filter(T.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in updates.dict(exclude_none=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task
@app.delete("/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(T).filter(T.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"status": "deleted"}

@app.get("/blocker/items")
def get_block_items(db: Session = Depends(get_db)):
    return db.query(B).all()

@app.post("/blocker/items")
def add_block_item(item: BIC, db: Session = Depends(get_db)):
    new_item = B(id=str(uuid.uuid4()), **item.dict())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@app.delete("/blocker/items/{item_id}")
def delete_block_item(item_id: str, db: Session = Depends(get_db)):
    item = db.query(B).filter(B.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"status": "deleted"}

@app.post("/focus/start")
def start_focus(db: Session = Depends(get_db)):
    active = db.query(FS).filter(FS.active == True).first()
    if active:
        return {"status": "already_active"}
    session = FS(id=str(uuid.uuid4()), started_at=time.time(), active=True)
    db.add(session)
    db.commit()
    items = db.query(B).filter(B.enabled == True).all()
    for item in items:
        if item.type == "website":
            block_website(get_hostname(item.value))
        elif item.type == "app":
            block_app(item.value)
    return {"status": "started"}

@app.post("/focus/stop")
def stop_focus(db: Session = Depends(get_db)):
    active = db.query(FS).filter(FS.active == True).first()
    if not active:
        raise HTTPException(status_code=404, detail="No active session")
    active.active = False
    active.ended_at = time.time()
    db.commit()
    items = db.query(B).filter(B.enabled == True).all()
    for item in items:
        if item.type == "website":
            unblock_website(get_hostname(item.value))
    return {"status": "stopped"}

@app.get("/focus/status")
def focus_status(db: Session = Depends(get_db)):
    active = db.query(FS).filter(FS.active == True).first()
    return {"active": bool(active), "session": active}
@app.post("/tasks/rollover")
def rollover_tasks(db: Session = Depends(get_db)):
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    today = date.today().isoformat()

    # get incomplete tasks from yesterday
    incomplete = db.query(T).filter(
        T.date == yesterday,
        T.completed == False
    ).all()

    rolled = 0
    for task in incomplete:
        # check if already rolled over today
        existing = db.query(T).filter(
            T.date == today,
            T.name == task.name
        ).first()
        if not existing:
            new_task = T(
                id=str(uuid.uuid4()),
                name=task.name,
                date=today,
                completed=False,
                time_spent=0,
                rollover_count=task.rollover_count + 1
            )
            db.add(new_task)
            rolled += 1

    db.commit()
    return {"rolled": rolled}    

    



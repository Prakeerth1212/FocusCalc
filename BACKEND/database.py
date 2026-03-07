from sqlalchemy import create_engine,Column,String,Integer,Boolean,Float,Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import sys
if getattr(sys, 'frozen', False):
    # Running as bundled exe
    bd= os.path.dirname(sys.executable)
else:
    # Running as script
    bd= os.path.dirname(os.path.abspath(__file__))

db= os.path.join(bd, "storage", "focuscalc.db")

# Create storage folder if it doesn't exist
os.makedirs(os.path.join(bd, "storage"), exist_ok=True)
eng=create_engine(f'sqlite:///{db}',connect_args={'check_same_thread':False})
sl=sessionmaker(autocommit=False,autoflush=False,bind=eng)
bas=declarative_base()
class T(bas):
    __tablename__='tasks'
    id=Column(String,primary_key=True)
    date=Column(String,nullable=False)
    name=Column(String,nullable=False)
    completed=Column(Boolean,default=False)
    time_spent=Column(Integer,default=0)
    timer_running=Column(Boolean,default=False)
    start_time=Column(Float,nullable=True)
    reason=Column(String,nullable=True)
    rollover_count=Column(Integer,default=0)

class B(bas):
    __tablename__='block_items'
    id=Column(String,primary_key=True)
    name=Column(String,nullable=False)
    type=Column(String,nullable=False)
    value=Column(String,nullable=False)
    category=Column(String,nullable=True)
    enabled=Column(String,nullable=True)

class FS(bas):
    __tablename__='focus_sessions'
    id=Column(String,primary_key=True)
    started_at=Column(Float,nullable=False)
    ended_at=Column(Float,nullable=True)
    active=Column(Boolean,default=True)

def init_db():
    bas.metadata.create_all(bind=eng)
    print("Db initialised at: ",db)
if __name__=='__main__':
    init_db()
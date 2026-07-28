<!-- FocusCalc v1.0.0 -->
# FocusCalc

A productivity app for Windows and Android that helps you manage tasks, track time, and block distracting apps/websites during focus sessions.

## Features

- ✅ Task management with per-task timers
- ✅ Focus mode with website and app blocking
- ✅ Rollover incomplete tasks to the next day
- ✅ Weekly report with daily breakdown
- ✅ Desktop + Mobile sync over local network
- ✅ Fully offline, no cloud required

## Stack

- **Backend:** Python FastAPI + SQLite
- **Desktop:** Electron (Windows)
- **Mobile:** React Native (Android)

## Setup

### Backend

```bash
cd BACKEND
python -m venv venv
venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy
uvicorn main:app --port 5000 --host 0.0.0.0
```

### Desktop

```bash
cd DESKTOP
npm install
npm start
```

### Mobile

```bash
cd FocusCalcMobile
npm install
npx react-native run-android
```

## Notes

- Run backend as Administrator for website blocking to work
- Mobile connects to desktop backend over WiFi (update API url in App.tsx)

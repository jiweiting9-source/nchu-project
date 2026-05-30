# NCHU Study Assistant

React + TypeScript + Vite app for checking NCHU transcript courses against graduation and program requirements.

## Run Locally

```powershell
npm install
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/`.

## Build

```powershell
npm run build
```

## Current Scope

- Import copied content from 學生歷年成績查詢.
- Calculate 外國語文學系 graduation progress for supported entry years.
- Track general education, professional, external-credit, PE/service-learning, repeated-course, failed, and withdrawn-course rules.
- Track 數位人文與資訊應用學程 progress.
- Export the course table as plain text.

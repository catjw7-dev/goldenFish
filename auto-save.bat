@echo off
set /p msg=커밋 메시지 입력: 
git add .
git commit -m "%msg%"
git push
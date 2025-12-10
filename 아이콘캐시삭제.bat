@echo off
echo 아이콘 캐시를 삭제합니다...
echo.

REM Explorer 종료
taskkill /f /im explorer.exe

REM 아이콘 캐시 파일 삭제
cd /d %userprofile%\AppData\Local
attrib -h IconCache.db
del IconCache.db /f /q

REM Windows 10/11의 추가 캐시 파일들
cd /d %userprofile%\AppData\Local\Microsoft\Windows\Explorer
del iconcache*.db /f /q
del thumbcache*.db /f /q

echo.
echo 캐시 삭제 완료!
echo Explorer를 다시 시작합니다...
echo.

REM Explorer 재시작
start explorer.exe

echo 완료! 5초 후 이 창이 닫힙니다.
timeout /t 5

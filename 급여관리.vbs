Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "chrome --app=file:///D:/xyz/MONEY/index.html", 0, False
Set WshShell = Nothing

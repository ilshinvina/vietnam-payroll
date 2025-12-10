const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // 메인 윈도우 생성
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'assets/lgos/khanh-quynh-logo.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    autoHideMenuBar: true, // 메뉴바 자동 숨김 (Alt 키로 표시 가능)
    backgroundColor: '#ffffff'
  });

  // index.html 로드
  mainWindow.loadFile('index.html');

  // 개발자 도구 단축키 (Ctrl+Shift+I)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // 창이 닫힐 때
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Electron 앱이 준비되면 창 생성
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // macOS에서 dock 아이콘 클릭 시 창 재생성
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 모든 창이 닫히면 앱 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 간단한 메뉴 설정 (선택 사항)
const menuTemplate = [
  {
    label: '파일',
    submenu: [
      {
        label: '종료',
        accelerator: 'Alt+F4',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: '보기',
    submenu: [
      {
        label: '새로고침',
        accelerator: 'F5',
        click: () => {
          if (mainWindow) {
            mainWindow.reload();
          }
        }
      },
      {
        label: '개발자 도구',
        accelerator: 'Ctrl+Shift+I',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
          }
        }
      }
    ]
  }
];

// 메뉴 적용
app.whenReady().then(() => {
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
});

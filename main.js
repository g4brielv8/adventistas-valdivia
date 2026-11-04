const { app, BrowserWindow, screen, protocol, shell, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { decrypt } = require('./crypt');
process.on('uncaughtException', (e) => console.error('Error:', e));

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

const CLAVE = ['__CLAVE__'].join('');
const BG = '#6f95bb';
const ICON = path.join(__dirname, 'build', 'icon.png');
const WP = { backgroundThrottling: false, devTools: !app.isPackaged, autoplayPolicy: 'no-user-gesture-required' };
let ctl = null, disp = null, dispId = null;

// Pantalla del templo: ventana sin bordes, a pantalla completa, en el monitor elegido en Ajustes (Esc la cierra).
function openDisplay(id) {
  const all = screen.getAllDisplays(), primary = screen.getPrimaryDisplay();
  const target = (id != null ? all.find(d => d.id === id) : null) || all.find(d => d.id !== primary.id) || null;
  const tid = target ? target.id : 0;
  if (disp && !disp.isDestroyed()) {            // si ya está abierta: la misma pantalla = cerrar; otra pantalla = moverla
    const same = dispId === tid;
    disp.close();
    if (same) return;
  }
  const o = { icon: ICON, backgroundColor: BG, frame: false, autoHideMenuBar: true, show: false, title: 'Pantalla del templo', webPreferences: WP };
  if (target) Object.assign(o, { x: target.bounds.x, y: target.bounds.y, width: target.bounds.width, height: target.bounds.height });
  else Object.assign(o, { width: 1280, height: 720 });
  const w = new BrowserWindow(o);
  disp = w; dispId = tid;
  w.setMenuBarVisibility(false);
  w.loadURL('app://local/index.html#pantalla');
  w.once('ready-to-show', () => {
    if (w.isDestroyed()) return;
    w.show();
    if (target) { if (process.platform === 'darwin') w.setSimpleFullScreen(true); else w.setFullScreen(true); }
  });
  w.webContents.on('before-input-event', (e, i) => { if (i.type === 'keyDown' && i.key === 'Escape' && !w.isDestroyed()) w.close(); });
  w.on('closed', () => { if (disp === w) { disp = null; dispId = null; } });
}

ipcMain.handle('displays', () => {
  const primary = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id,
    label: (d.label || ('Pantalla ' + (i + 1))) + ' (' + d.bounds.width + '×' + d.bounds.height + ')' + (d.id === primary ? ' · principal' : ''),
    primary: d.id === primary
  }));
});
ipcMain.handle('open-temple', (e, id) => { try { openDisplay(id); } catch (err) { console.error(err); } });
ipcMain.handle('version', () => app.getVersion());

function createControl() {
  ctl = new BrowserWindow({ icon: ICON, width: 1280, height: 800, minWidth: 900, minHeight: 640, backgroundColor: BG, title: 'Adventistas Valdivia',
    webPreferences: { ...WP, preload: path.join(__dirname, 'preload.js') } });
  ctl.loadURL('app://local/index.html');
  ctl.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('#pantalla')) openDisplay(); else if (/^https:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  ctl.webContents.on('will-navigate', (e) => e.preventDefault());
  ctl.on('closed', () => { ctl = null; if (disp && !disp.isDestroyed()) disp.close(); app.quit(); });
}

function setupUpdater() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-downloaded', async (info) => {
    const r = await dialog.showMessageBox(ctl && !ctl.isDestroyed() ? ctl : undefined, {
      type: 'info', buttons: ['Reiniciar ahora', 'Después'], defaultId: 1, cancelId: 1,
      title: 'Actualización lista', message: `La versión ${info.version} está lista.`, detail: 'Se instalará al cerrar la aplicación.'
    });
    if (r.response === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.on('error', (e) => console.error('Actualizador:', e));
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  check(); setInterval(check, 4 * 60 * 60 * 1000);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (ctl) { if (ctl.isMinimized()) ctl.restore(); ctl.focus(); } });
  app.whenReady().then(() => {
    const root = path.join(__dirname, 'app');
    protocol.handle('app', () => {
      const bin = path.join(root, 'app.bin');
      let html;
      if (fs.existsSync(bin) && !CLAVE.includes('__')) html = decrypt(fs.readFileSync(bin), CLAVE);   // versión protegida
      else html = fs.readFileSync(path.join(root, 'index.html'));                                    // modo desarrollo
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    });
    Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]) : null);
    createControl();
    if (screen.getAllDisplays().length > 1) openDisplay();
    setupUpdater();
  });
  app.on('window-all-closed', () => app.quit());
}

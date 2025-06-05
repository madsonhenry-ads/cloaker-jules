const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const config = require('./config');
const fs = require('fs');
const path = require('path');
const { initDb, insertCaptureRecord } = require('./utils/database'); // Import DB functions

puppeteer.use(StealthPlugin());

const logsDir = './logs';
const screenshotsDir = path.join(logsDir, 'screenshots');
const htmlFilePrefix = 'page_'; // Prefix for unique HTML files
const jsonLogPath = path.join(logsDir, 'page_logs.json');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function appendToJsonLog(logEntry) {
  // ... (keep existing appendToJsonLog function as is)
  let logs = [];
  if (fs.existsSync(jsonLogPath)) {
    try {
      const existingLogs = fs.readFileSync(jsonLogPath, 'utf-8');
      if (existingLogs.trim() !== "") {
        logs = JSON.parse(existingLogs);
        if (!Array.isArray(logs)) {
          console.warn('page_logs.json does not contain a valid JSON array. Initializing with new array.');
          logs = [];
        }
      }
    } catch (e) {
      console.warn(`Error reading or parsing page_logs.json: ${e.message}. Initializing with new array.`);
      logs = [];
    }
  }
  logs.push(logEntry);
  fs.writeFileSync(jsonLogPath, JSON.stringify(logs, null, 2), 'utf-8');
}

function generateTimestampedFilename(url, prefix, extension) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let hostname = 'default';
  try {
    hostname = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
  } catch (e) { /* Use default */ }
  return `${prefix}${hostname}_${timestamp}.${extension}`;
}

(async () => {
  await initDb(); // Initialize database connection early

  const targetUrl = process.argv[2];

  // Generate unique filenames for this run for HTML and Screenshot
  const currentHtmlFilename = generateTimestampedFilename(targetUrl, 'page_', 'html');
  const currentHtmlPath = path.join(logsDir, currentHtmlFilename);
  const currentScreenshotFilename = generateTimestampedFilename(targetUrl, 'screenshot_', 'png');
  const currentScreenshotPath = path.join(screenshotsDir, currentScreenshotFilename);


  if (!targetUrl) {
    console.error("Erro: URL alvo não fornecida.");
    console.log("Uso: node index.js <URL_ALVO>");
    const errorLogEntry = {
      timestamp: new Date().toISOString(), url: 'N/A', status: 'failure',
      proxy_used: config.proxy || 'N/A', error_message: 'URL alvo não fornecida na linha de comando.',
      html_content_path: null, screenshot_path: null
    };
    appendToJsonLog(errorLogEntry);
    try { await insertCaptureRecord(errorLogEntry); } catch (e) { console.error("DB Error:", e); }
    process.exit(1);
  }

  console.log(`Iniciando captura para URL: ${targetUrl}`);

  const logEntry = {
    timestamp: new Date().toISOString(),
    url: targetUrl,
    status: 'pending',
    proxy_used: config.proxy || 'N/A',
    error_message: null,
    html_content_path: null, // Will be set on success
    screenshot_path: null // Will be set on success
  };

  const browserArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--single-process'];
  if (config.proxy) {
    browserArgs.push(`--proxy-server=\${config.proxy}`);
  } else {
    console.warn("Atenção: Proxy não configurado em config.js. Acessando diretamente.");
    logEntry.proxy_used = 'none';
  }

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: browserArgs });
    const page = await browser.newPage();
    await page.setUserAgent(config.userAgent);
    await page.setExtraHTTPHeaders({ 'referer': config.referer });

    console.log(`Navegando para ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: config.timeout || 60000 });
    console.log('Navigation successful.');

    const content = await page.content();
    fs.writeFileSync(currentHtmlPath, content); // Save to unique HTML file
    logEntry.html_content_path = currentHtmlPath; // Log the path to this unique HTML file
    console.log(`Página HTML capturada com sucesso em ${currentHtmlPath}`);

    await page.screenshot({ path: currentScreenshotPath, fullPage: true });
    logEntry.screenshot_path = currentScreenshotPath; // Log the path to this unique screenshot
    console.log(`Screenshot capturado com sucesso em ${currentScreenshotPath}`);

    logEntry.status = 'success';

  } catch (error) {
    console.error(`Erro durante execução do Puppeteer para ${targetUrl}: ${error.message}`);
    logEntry.status = 'failure';
    logEntry.error_message = error.message;
    // html_content_path and screenshot_path remain null or previous value
  } finally {
    if (browser) {
      await browser.close();
      console.log('Navegador fechado.');
    }
    appendToJsonLog(logEntry); // Still log to JSON file
    try {
      await insertCaptureRecord(logEntry); // Also log to SQLite DB
      console.log('Registro da captura salvo no banco de dados.');
    } catch (dbError) {
      console.error('Falha ao salvar registro no banco de dados:', dbError.message);
    }
    console.log(`Log JSON adicionado em ${jsonLogPath}`);
  }
})();

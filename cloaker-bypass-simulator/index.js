const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const minimist = require('minimist'); // For parsing command-line arguments
const { initDb, insertCaptureRecord } = require('./utils/database');
const importedConfig = require('./config'); // Renamed to avoid conflict with 'config' variable

puppeteer.use(StealthPlugin());

const logsDir = './logs';
const screenshotsDir = path.join(logsDir, 'screenshots');
const jsonLogPath = path.join(logsDir, 'page_logs.json');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function appendToJsonLog(logEntry) {
  let logs = [];
  if (fs.existsSync(jsonLogPath)) {
    try {
      const existingLogs = fs.readFileSync(jsonLogPath, 'utf-8');
      if (existingLogs.trim() !== "") {
        logs = JSON.parse(existingLogs);
        if (!Array.isArray(logs)) {
          logs = [];
        }
      }
    } catch (e) {
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
  await initDb();

  // Parse command line arguments
  // Expected format: node index.js --url <target_url> [--proxy <proxy_url>] [--userAgent <user_agent_string>] [--referer <referer_url>]
  // Or for backward compatibility: node index.js <target_url> (though --url is preferred)
  const argv = minimist(process.argv.slice(2));

  const targetUrl = argv.url || argv._[0]; // Allow --url or first positional argument
  const cliProxy = argv.proxy;
  const cliUserAgent = argv.userAgent;
  const cliReferer = argv.referer;

  // Determine effective config, CLI args override config.js
  const effectiveConfig = {
    proxy: cliProxy !== undefined ? cliProxy : importedConfig.proxy,
    userAgent: cliUserAgent !== undefined ? cliUserAgent : importedConfig.userAgent,
    referer: cliReferer !== undefined ? cliReferer : importedConfig.referer,
    timeout: importedConfig.timeout || 60000 // Timeout from config.js or default
  };

  // Ensure proxy is null if empty string is passed, so it's not used
  if (effectiveConfig.proxy === "") {
    effectiveConfig.proxy = null;
  }


  const currentHtmlFilename = generateTimestampedFilename(targetUrl, 'page_', 'html');
  const currentHtmlPath = path.join(logsDir, currentHtmlFilename);
  const currentScreenshotFilename = generateTimestampedFilename(targetUrl, 'screenshot_', 'png');
  const currentScreenshotPath = path.join(screenshotsDir, currentScreenshotFilename);

  if (!targetUrl) {
    console.error("Erro: URL alvo não fornecida.");
    console.log("Uso: node index.js --url <URL_ALVO> [--proxy PROXY_URL] [--userAgent UA_STRING] [--referer REFERER_URL]");
    const errorLogEntry = {
      timestamp: new Date().toISOString(), url: 'N/A', status: 'failure',
      proxy_used: effectiveConfig.proxy || 'N/A',
      error_message: 'URL alvo não fornecida.',
      html_content_path: null, screenshot_path: null
    };
    appendToJsonLog(errorLogEntry);
    try { await insertCaptureRecord(errorLogEntry); } catch (e) { console.error("DB Error:", e); }
    process.exit(1);
  }

  console.log(`Iniciando captura para URL: ${targetUrl}`);
  console.log(`Usando config: Proxy: ${effectiveConfig.proxy || 'Nenhum'}, User-Agent: ${effectiveConfig.userAgent}, Referer: ${effectiveConfig.referer}`);

  const logEntry = {
    timestamp: new Date().toISOString(),
    url: targetUrl,
    status: 'pending',
    proxy_used: effectiveConfig.proxy || 'none',
    error_message: null,
    html_content_path: null,
    screenshot_path: null
  };

  const browserArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--single-process'];
  if (effectiveConfig.proxy) {
    browserArgs.push(`--proxy-server=\${effectiveConfig.proxy}`);
  } else {
    console.warn("Atenção: Proxy não configurado ou fornecido como vazio. Acessando diretamente.");
  }

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: browserArgs });
    const page = await browser.newPage();
    await page.setUserAgent(effectiveConfig.userAgent);
    await page.setExtraHTTPHeaders({ 'referer': effectiveConfig.referer });

    console.log(`Navegando para ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: effectiveConfig.timeout });
    console.log('Navigation successful.');

    const content = await page.content();
    fs.writeFileSync(currentHtmlPath, content);
    logEntry.html_content_path = currentHtmlPath;
    console.log(`Página HTML capturada com sucesso em ${currentHtmlPath}`);

    await page.screenshot({ path: currentScreenshotPath, fullPage: true });
    logEntry.screenshot_path = currentScreenshotPath;
    console.log(`Screenshot capturado com sucesso em ${currentScreenshotPath}`);

    logEntry.status = 'success';

  } catch (error) {
    console.error(`Erro durante execução do Puppeteer para ${targetUrl}: ${error.message}`);
    logEntry.status = 'failure';
    logEntry.error_message = error.message;
  } finally {
    if (browser) {
      await browser.close();
      console.log('Navegador fechado.');
    }
    appendToJsonLog(logEntry);
    try {
      await insertCaptureRecord(logEntry);
      console.log('Registro da captura salvo no banco de dados.');
    } catch (dbError) {
      console.error('Falha ao salvar registro no banco de dados:', dbError.message);
    }
    console.log(`Log JSON adicionado em ${jsonLogPath}`);
  }
})();

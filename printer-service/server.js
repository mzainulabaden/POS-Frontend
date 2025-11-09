/* eslint-disable no-console */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const net = require('net');

// 'printer' is optional and only used for OS-default printer route
let printerModule = null;
try {
  // Optional native dependency (may fail to install on some systems)
  // Used when sending to Windows/Mac default printer
  printerModule = require('printer');
} catch (_) {
  printerModule = null;
}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors({ origin: true }));
app.use(bodyParser.json({ limit: '1mb' }));

/**
 * Send ESC/POS raw string to a network printer over TCP (9100 by default)
 */
function sendToNetworkPrinter(rawString, host, port = 9100) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.connect(port, host, () => {
      const buf = Buffer.from(rawString, 'binary');
      client.write(buf);
      client.end();
    });
    client.on('close', resolve);
    client.on('error', reject);
  });
}

/**
 * Send raw data to OS printer (default or by name) using optional 'printer' module
 */
function sendToOSPrinter(rawString, printerName /* optional */) {
  return new Promise((resolve, reject) => {
    if (!printerModule) {
      return reject(
        new Error('printer module not available. Run: npm i --optional printer')
      );
    }
    const buf = Buffer.from(rawString, 'binary');
    try {
      printerModule.printDirect({
        data: buf,
        type: 'RAW',
        printer: printerName || undefined,
        success: () => resolve(),
        error: (err) => reject(err),
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Health check
 */
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'pos-local-printer-service' });
});

/**
 * POST /print
 * body: { printer?: "default" | "<os-printer-name>" | "<ip>", data: "<escpos-string>", port?: 9100 }
 */
app.post('/print', async (req, res) => {
  const { printer, data, port } = req.body || {};
  const escpos = typeof data === 'string' ? data : '';
  if (!escpos) {
    return res.status(400).json({ ok: false, error: 'Missing data (ESC/POS string).' });
  }

  // Environment defaults
  const envHost = process.env.PRINTER_HOST;
  const envPort = parseInt(process.env.PRINTER_PORT || '9100', 10);

  try {
    // 1) If explicit IP or env host available → send over TCP
    const targetHost = (printer && /^\d{1,3}(\.\d{1,3}){3}$/.test(printer)) ? printer : envHost;
    if (targetHost) {
      await sendToNetworkPrinter(escpos, targetHost, port || envPort);
      return res.json({ ok: true, route: 'network', host: targetHost, port: port || envPort });
    }

    // 2) Otherwise, try OS printer (default or by provided name)
    const printerName = (!printer || printer === 'default') ? undefined : String(printer);
    await sendToOSPrinter(escpos, printerName);
    return res.json({ ok: true, route: 'os', printer: printerName || 'default' });
  } catch (error) {
    console.error('Print error:', error);
    return res.status(500).json({ ok: false, error: error.message || String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`Printer service listening on http://localhost:${PORT}`);
  if (process.env.PRINTER_HOST) {
    console.log(`Network printer: ${process.env.PRINTER_HOST}:${process.env.PRINTER_PORT || 9100}`);
  } else if (printerModule) {
    console.log('OS printer route enabled (default or by name).');
  } else {
    console.log('OS printer route disabled (install optional dependency "printer").');
  }
});



POS Local Printer Service

This small Node service receives ESC/POS data from the frontend and sends it to a thermal printer, allowing silent printing without the browser dialog.

How it works
- Frontend posts to http://localhost:3000/print with a JSON body: { "printer": "default" | "<os-printer-name>" | "<ip>", "data": "<escpos>", "port": 9100 }
- If an IP is provided (or PRINTER_HOST is set), the service opens a TCP socket (default 9100) and streams the raw ESC/POS bytes to the network printer.
- Otherwise, it attempts to send to your OS printer (default or by name) using the optional native module printer.

Setup
1) Install dependencies:
   npm install

2) Optional: if you want to print to your OS default printer (USB/Bluetooth connected) instead of a network IP, also install the native printer module (may require build tools):
   npm install --optional printer

3) For a network printer, you can set environment variables before starting:
   - PRINTER_HOST=192.168.1.50
   - PRINTER_PORT=9100 (defaults to 9100)

4) Start the service:
   npm start

5) Test:
   GET http://localhost:3000/health should return { ok: true }.

Frontend integration
- The app already calls http://localhost:3000/print via ThermalPrinterService.sendToThermalPrinter.
- If PRINTER_HOST is set, no body.printer is required; otherwise, the frontend sends "printer": "default" (OS default).

Troubleshooting
- If you see "printer module not available", either use a network IP route or run:
  npm install --optional printer
- If nothing prints over the network route, confirm the printer’s IP/port and that it accepts raw ESC/POS on 9100.
- Firewalls can block localhost:3000; allow it if prompted.



# Thermal Printer Server

A Node.js middleware service for direct thermal printer communication using ESC/POS commands.

## Features

- 🖨️ USB thermal printer support
- 🌐 Network thermal printer support
- ✅ Test print functionality
- 🔍 Automatic printer detection
- 📝 ESC/POS command processing
- 🚀 Simple REST API

## Installation

1. Install Node.js (if not already installed)
2. Navigate to this directory:
```bash
cd thermal-printer-server
```

3. Install dependencies:
```bash
npm install
```

## Usage

### Start the server:

```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### 1. Health Check
```
GET http://localhost:3000/
```

Response:
```json
{
  "status": "running",
  "message": "Thermal Printer Server is running",
  "version": "1.0.0"
}
```

### 2. List Available Printers
```
GET http://localhost:3000/printers
```

Response:
```json
{
  "success": true,
  "count": 1,
  "devices": [
    {
      "index": 0,
      "vendorId": 1234,
      "productId": 5678
    }
  ]
}
```

### 3. Print to USB Printer
```
POST http://localhost:3000/print
Content-Type: application/json

{
  "data": "ESC/POS command string",
  "printerIndex": 0
}
```

### 4. Print to Network Printer
```
POST http://localhost:3000/print-network
Content-Type: application/json

{
  "data": "ESC/POS command string",
  "printerIP": "192.168.1.100",
  "port": 9100
}
```

### 5. Test Print
```
POST http://localhost:3000/test-print
Content-Type: application/json

{
  "printerIndex": 0
}
```

## Troubleshooting

### Printer Not Detected

**Windows:**
1. Check if printer is connected via USB
2. Run Command Prompt as Administrator
3. Start the server with admin privileges

**Linux:**
1. Add user to lp group:
```bash
sudo usermod -a -G lp $USER
```

2. Set USB permissions:
```bash
sudo chmod 666 /dev/usb/lp0
```

3. Create udev rule (permanent solution):
```bash
sudo nano /etc/udev/rules.d/99-escpos.rules
```

Add:
```
SUBSYSTEM=="usb", ATTRS{idVendor}=="YOUR_VENDOR_ID", ATTRS{idProduct}=="YOUR_PRODUCT_ID", MODE="0666"
```

4. Reload udev rules:
```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

**macOS:**
1. Grant Terminal/Node full disk access in System Preferences
2. Check USB device permissions

### Permission Errors

Run with elevated privileges:
- Windows: Run as Administrator
- Linux/Mac: `sudo npm start`

### Port Already in Use

Change the port in server.js or set environment variable:
```bash
PORT=3001 npm start
```

## Network Printer Setup

1. Find your printer's IP address (usually printed on config page)
2. Ensure printer is on the same network
3. Test connection:
```bash
ping 192.168.1.100
```
4. Use the `/print-network` endpoint with your printer's IP

## Testing

Test with curl:

```bash
# Health check
curl http://localhost:3000/

# List printers
curl http://localhost:3000/printers

# Test print
curl -X POST http://localhost:3000/test-print \
  -H "Content-Type: application/json" \
  -d '{"printerIndex": 0}'
```

## Windows Service Setup

To run as a Windows service:

1. Install node-windows:
```bash
npm install -g node-windows
```

2. Create `install-service.js`:
```javascript
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'Thermal Printer Service',
  description: 'POS Thermal Printer Middleware',
  script: require('path').join(__dirname, 'server.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

svc.on('install', function() {
  svc.start();
  console.log('Service installed and started');
});

svc.install();
```

3. Run:
```bash
node install-service.js
```

To uninstall:
```javascript
// uninstall-service.js
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'Thermal Printer Service',
  script: require('path').join(__dirname, 'server.js')
});

svc.on('uninstall', function() {
  console.log('Service uninstalled');
});

svc.uninstall();
```

## Dependencies

- **express** - Web server framework
- **cors** - Cross-origin resource sharing
- **escpos** - ESC/POS command library
- **escpos-usb** - USB printer adapter
- **escpos-network** - Network printer adapter

## Security Notes

For production:
1. Configure CORS to only allow your POS frontend domain
2. Add authentication/API key
3. Use HTTPS if exposing over network
4. Restrict network access with firewall rules
5. Run as limited user (not admin) when possible

## Support

Common thermal printer brands supported:
- Epson
- Star Micronics  
- Bixolon
- Citizen
- Custom
- Generic ESC/POS compatible printers

If your printer is not detected:
1. Check if it's ESC/POS compatible
2. Verify USB/Network connection
3. Check vendor documentation for specific commands
4. Try updating firmware













































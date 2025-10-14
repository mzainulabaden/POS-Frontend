# Thermal Printer Setup Guide

This guide explains how to use the thermal printer functionality in your POS system.

## Features

The thermal printer implementation includes:

1. **Browser-based printing** - Works with thermal printers that have proper drivers installed
2. **ESC/POS command generation** - For direct thermal printer communication
3. **Receipt template** - Customizable receipt layout optimized for 80mm thermal printers
4. **Automatic printing** - Prints receipt automatically after successful order save
5. **Manual printing** - Print button to reprint receipts anytime

## How It Works

### 1. Browser Print (Default Method)

The simplest method uses the browser's print dialog. This works with:
- Thermal printers with installed drivers
- Network thermal printers configured as system printers
- Regular printers (for testing)

**How to use:**
1. Install your thermal printer drivers on the POS computer
2. Set the thermal printer as default printer (optional)
3. When you click "Save & Print" or "Print Receipt", the browser print dialog will open
4. Select your thermal printer and print

**Print Settings:**
- Paper size: 80mm (auto-detected for thermal printers)
- Margins: None (set in print dialog)
- Orientation: Portrait

### 2. Direct Thermal Printing (Advanced)

For direct communication with thermal printers via USB/Network without drivers, use the ESC/POS method.

**Requirements:**
- A middleware service running on the POS computer
- Node.js installed
- Thermal printer connected via USB or network

**Setup:**

#### Step 1: Install the middleware service

Create a new folder `thermal-printer-server` and add these files:

**package.json:**
```json
{
  "name": "thermal-printer-server",
  "version": "1.0.0",
  "description": "Thermal printer middleware for POS",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "escpos": "^3.0.0-alpha.6",
    "escpos-usb": "^3.0.0-alpha.4"
  }
}
```

**server.js:**
```javascript
const express = require('express');
const cors = require('cors');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// List available USB printers
app.get('/printers', (req, res) => {
  const devices = escpos.USB.findPrinter();
  res.json({ devices });
});

// Print to thermal printer
app.post('/print', async (req, res) => {
  try {
    const { data } = req.body;
    
    // Find USB printer
    const device = new escpos.USB();
    const printer = new escpos.Printer(device);
    
    device.open(function(error) {
      if (error) {
        console.error('Error opening device:', error);
        return res.status(500).json({ error: 'Failed to open printer' });
      }
      
      // Send ESC/POS commands
      printer.text(data);
      printer.close();
      
      res.json({ success: true, message: 'Print job sent' });
    });
    
  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Thermal printer server running on http://localhost:${PORT}`);
  console.log('Available printers:');
  const devices = escpos.USB.findPrinter();
  console.log(devices);
});
```

#### Step 2: Run the middleware

```bash
cd thermal-printer-server
npm install
npm start
```

#### Step 3: Configure the Angular app

Update the thermal printer service to use the middleware by uncommenting the direct printing code in `pos-cart-sidebar.component.ts`:

```typescript
// Instead of this.thermalPrinter.printReceipt(receiptData);
// Use this for direct thermal printing:
await this.thermalPrinter.sendToThermalPrinter(receiptData);
```

## Customization

### Receipt Template

Edit `src/pos/components/receipt-template/receipt-template.component.html` to customize:
- Store name and logo
- Store address and contact
- Receipt layout
- Font sizes and styling

### Store Information

Update the store details in:
1. **thermal-printer.service.ts** - `generateESCPOSCommands()` method
2. **receipt-template.component.html** - Store header section

Example:
```typescript
// In generateESCPOSCommands():
commands += 'YOUR STORE NAME' + LF;  // Change this
commands += 'Address Line 1' + LF;    // Change this
commands += 'City, Country' + LF;     // Change this
commands += 'Tel: +1234567890' + LF;  // Change this
```

### Print Styles

Edit `src/pos/components/receipt-template/receipt-template.component.css`:

```css
@media print {
  .receipt-container {
    width: 80mm;  /* Change for different paper sizes */
  }
  
  .receipt {
    font-size: 11px;  /* Adjust font size */
  }
  
  @page {
    size: 80mm auto;  /* 58mm for smaller receipts */
  }
}
```

## Usage

### Automatic Printing

When you complete a sale:
1. Add items to cart
2. Click "Proceed"
3. Enter payment details
4. Click "Save & Print"
5. Receipt prints automatically after successful save

### Manual Printing

To print a receipt for current cart items:
1. Click the "Print Receipt" button in the cart sidebar
2. Select your printer from the print dialog
3. Click Print

Note: Manual printing shows current cart state, not saved order data.

## Troubleshooting

### Print dialog doesn't appear
- Check browser permissions for printing
- Ensure browser pop-ups are not blocked
- Try a different browser (Chrome recommended)

### Receipt is cut off
- Adjust margins in print dialog to "None"
- Check printer settings for paper size (80mm)
- Verify page size in CSS (`@page { size: 80mm auto; }`)

### Thermal printer not detected (Direct method)
- Ensure printer is connected via USB
- Check if printer drivers are installed
- Verify the middleware service is running
- Check printer permissions on Windows/Linux
- Run middleware with administrator/sudo privileges if needed

### ESC/POS commands not working
- Verify your printer supports ESC/POS
- Check manufacturer documentation for specific command set
- Some printers use different command variations
- Try updating the escpos library version

### Receipt content is incorrect
- Check the `printReceipt()` method in `pos-cart-sidebar.component.ts`
- Verify form values are correctly mapped
- Console.log the receiptData to debug

## Network Thermal Printers

For network thermal printers:

1. Install `escpos-network` instead of `escpos-usb`
2. Update server.js:

```javascript
const escpos = require('escpos');
escpos.Network = require('escpos-network');

const device = new escpos.Network('192.168.1.100');  // Printer IP
const printer = new escpos.Printer(device);
```

## Testing

To test printing without a thermal printer:
1. Use a regular printer or PDF printer
2. Save as PDF to preview receipt layout
3. Verify all data is displaying correctly
4. Adjust styling as needed

## Browser Compatibility

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari (Mac only for AirPrint)
- ⚠️ Mobile browsers (limited print support)

## Production Deployment

For production:
1. Update store information in all templates
2. Test with actual thermal printer
3. Configure auto-print settings
4. Set up middleware as Windows service (for direct printing)
5. Create shortcuts for easy POS operation

## Windows Service Setup (Optional)

To run the middleware as a Windows service:

1. Install node-windows:
```bash
npm install -g node-windows
```

2. Create install.js:
```javascript
var Service = require('node-windows').Service;

var svc = new Service({
  name: 'Thermal Printer Service',
  description: 'POS Thermal Printer Middleware',
  script: 'C:\\path\\to\\server.js'
});

svc.on('install', function() {
  svc.start();
});

svc.install();
```

3. Run: `node install.js`

## Support

For issues or questions:
1. Check console for errors (F12 in browser)
2. Review middleware logs
3. Verify printer connectivity
4. Check printer documentation for ESC/POS compatibility



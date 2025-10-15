const express = require('express');
const cors = require('cors');
const escpos = require('escpos');

// Import adapter for your printer type
// For USB printers:
escpos.USB = require('escpos-usb');

// For Network printers (uncomment if needed):
// escpos.Network = require('escpos-network');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // In production, restrict to your POS frontend URL
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    message: 'Thermal Printer Server is running',
    version: '1.0.0'
  });
});

// List available USB printers
app.get('/printers', (req, res) => {
  try {
    const devices = escpos.USB.findPrinter();
    res.json({ 
      success: true,
      count: devices.length,
      devices: devices.map((device, index) => ({
        index,
        vendorId: device.deviceDescriptor.idVendor,
        productId: device.deviceDescriptor.idProduct
      }))
    });
  } catch (error) {
    console.error('Error finding printers:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Print to USB thermal printer
app.post('/print', async (req, res) => {
  try {
    const { data, printerIndex = 0 } = req.body;
    
    if (!data) {
      return res.status(400).json({ 
        success: false,
        error: 'No print data provided' 
      });
    }
    
    // Find USB printers
    const devices = escpos.USB.findPrinter();
    
    if (devices.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No USB thermal printers found' 
      });
    }
    
    // Select printer by index
    const selectedDevice = devices[printerIndex] || devices[0];
    const device = new escpos.USB(
      selectedDevice.deviceDescriptor.idVendor,
      selectedDevice.deviceDescriptor.idProduct
    );
    
    const printer = new escpos.Printer(device);
    
    device.open(function(error) {
      if (error) {
        console.error('Error opening device:', error);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to open printer: ' + error.message 
        });
      }
      
      try {
        // Send raw ESC/POS commands
        printer.raw(Buffer.from(data, 'utf-8'));
        printer.close();
        
        console.log('Print job sent successfully');
        res.json({ 
          success: true, 
          message: 'Print job sent successfully' 
        });
      } catch (printError) {
        console.error('Print error:', printError);
        res.status(500).json({ 
          success: false,
          error: 'Print failed: ' + printError.message 
        });
      }
    });
    
  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Print to network thermal printer
app.post('/print-network', async (req, res) => {
  try {
    const { data, printerIP = '192.168.1.100', port = 9100 } = req.body;
    
    if (!data) {
      return res.status(400).json({ 
        success: false,
        error: 'No print data provided' 
      });
    }
    
    const device = new escpos.Network(printerIP, port);
    const printer = new escpos.Printer(device);
    
    device.open(function(error) {
      if (error) {
        console.error('Error opening network printer:', error);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to connect to network printer: ' + error.message 
        });
      }
      
      try {
        // Send raw ESC/POS commands
        printer.raw(Buffer.from(data, 'utf-8'));
        printer.close();
        
        console.log('Network print job sent successfully');
        res.json({ 
          success: true, 
          message: 'Print job sent to network printer' 
        });
      } catch (printError) {
        console.error('Network print error:', printError);
        res.status(500).json({ 
          success: false,
          error: 'Network print failed: ' + printError.message 
        });
      }
    });
    
  } catch (error) {
    console.error('Network print error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Test print endpoint - prints a simple test receipt
app.post('/test-print', async (req, res) => {
  try {
    const { printerIndex = 0 } = req.body;
    
    const devices = escpos.USB.findPrinter();
    
    if (devices.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No USB thermal printers found' 
      });
    }
    
    const selectedDevice = devices[printerIndex] || devices[0];
    const device = new escpos.USB(
      selectedDevice.deviceDescriptor.idVendor,
      selectedDevice.deviceDescriptor.idProduct
    );
    
    const printer = new escpos.Printer(device);
    
    device.open(function(error) {
      if (error) {
        console.error('Error opening device:', error);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to open printer: ' + error.message 
        });
      }
      
      try {
        printer
          .align('ct')
          .style('bu')
          .size(2, 2)
          .text('TEST RECEIPT')
          .size(1, 1)
          .style('normal')
          .text('------------------------')
          .text('Thermal Printer Test')
          .text('Date: ' + new Date().toLocaleString())
          .text('------------------------')
          .text('If you can read this,')
          .text('your thermal printer')
          .text('is working correctly!')
          .text('------------------------')
          .feed(2)
          .cut()
          .close();
        
        console.log('Test print sent successfully');
        res.json({ 
          success: true, 
          message: 'Test print sent successfully' 
        });
      } catch (printError) {
        console.error('Test print error:', printError);
        res.status(500).json({ 
          success: false,
          error: 'Test print failed: ' + printError.message 
        });
      }
    });
    
  } catch (error) {
    console.error('Test print error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false,
    error: error.message || 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🖨️  Thermal Printer Server Started');
  console.log('='.repeat(50));
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
  console.log('='.repeat(50));
  
  // List available printers
  try {
    const devices = escpos.USB.findPrinter();
    console.log(`🖨️  Found ${devices.length} USB thermal printer(s):`);
    devices.forEach((device, index) => {
      console.log(`   [${index}] VendorID: ${device.deviceDescriptor.idVendor}, ProductID: ${device.deviceDescriptor.idProduct}`);
    });
  } catch (error) {
    console.log('⚠️  No USB printers detected or error finding printers');
  }
  
  console.log('='.repeat(50));
  console.log('Available endpoints:');
  console.log('  GET  /           - Health check');
  console.log('  GET  /printers   - List available printers');
  console.log('  POST /print      - Print to USB printer');
  console.log('  POST /print-network - Print to network printer');
  console.log('  POST /test-print - Send test print');
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});






# Thermal Printer Quick Start Guide 🖨️

Get your POS thermal printer up and running in minutes!

## ✅ What's Been Implemented

Your POS system now includes:

1. ✨ **Thermal Printer Service** - Handles all printing logic
2. 🎨 **Receipt Template Component** - Beautiful, customizable receipt layout
3. 🔄 **Auto-Print** - Automatically prints after successful order save
4. 🖱️ **Manual Print Button** - Print receipts anytime
5. 📄 **80mm Thermal Paper** - Optimized for standard thermal printers
6. 🔌 **Two Printing Methods** - Browser print OR direct ESC/POS

## 🚀 Quick Start (Browser Print Method)

This is the **easiest method** and works with most thermal printers.

### Step 1: Install Printer Drivers
1. Connect your thermal printer to the POS computer via USB
2. Install the manufacturer's drivers
3. Set as default printer (optional)

### Step 2: Configure Store Info
Edit `src/pos/components/receipt-template/receipt-template.component.html`:

```html
<!-- Update these lines with your store info -->
<h2 class="store-name">YOUR STORE NAME</h2>
<p>Address Line 1</p>
<p>City, Country</p>
<p>Tel: +1234567890</p>
```

### Step 3: Test Print
1. Run your Angular app: `npm start`
2. Go to POS page
3. Add items to cart
4. Click "Print Receipt" button
5. Select your thermal printer in the print dialog
6. Click Print

**That's it! You're ready to print receipts! 🎉**

## 📋 How to Use

### During Sales
1. Add items to cart
2. Click "Proceed" button
3. Select customer and payment method
4. Enter received amount
5. Click **"Save & Print"**
6. Receipt prints automatically ✅

### Manual Printing
- Click the **"Print Receipt"** button in the cart sidebar anytime
- Works for current cart items (before or after saving)

### Browser Print Settings
When the print dialog appears:
- **Paper Size**: 80mm (or auto)
- **Margins**: None
- **Orientation**: Portrait
- **Scale**: 100%

## 🎨 Customization

### Change Store Information

**Location 1:** `src/pos/components/receipt-template/receipt-template.component.html`
```html
<h2 class="store-name">My Store Name</h2>
<p>123 Main Street</p>
<p>City, State 12345</p>
<p>Tel: (555) 123-4567</p>
```

**Location 2:** `src/pos/core/services/thermal-printer.service.ts` (line ~45)
```typescript
commands += 'My Store Name' + LF;
commands += '123 Main Street' + LF;
commands += 'City, State 12345' + LF;
commands += 'Tel: (555) 123-4567' + LF;
```

### Adjust Paper Size

Edit `src/pos/components/receipt-template/receipt-template.component.css`:
```css
@media print {
  .receipt-container {
    width: 58mm;  /* Change to 58mm for smaller receipts */
  }
  
  @page {
    size: 58mm auto;  /* Match paper size */
  }
}
```

### Change Font Size
```css
@media print {
  .receipt {
    font-size: 10px;  /* Smaller font */
  }
  
  .grand-total {
    font-size: 16px;  /* Larger total */
  }
}
```

## 🔧 Advanced Setup (Direct Thermal Printing)

For **direct ESC/POS printing** without drivers (optional):

### Step 1: Install Middleware
```bash
cd thermal-printer-server
npm install
```

### Step 2: Start Middleware Server
```bash
npm start
```

Server runs on `http://localhost:3000`

### Step 3: Test Connection
Open browser: `http://localhost:3000/printers`

Should show detected printers.

### Step 4: Enable in Angular
In `src/pos/components/pos-cart-sidebar/pos-cart-sidebar.component.ts`, change:
```typescript
// From:
this.thermalPrinter.printReceipt(receiptData);

// To:
this.thermalPrinter.sendToThermalPrinter(receiptData);
```

## 🧪 Testing

### Test Print from Middleware
```bash
curl -X POST http://localhost:3000/test-print \
  -H "Content-Type: application/json" \
  -d '{"printerIndex": 0}'
```

### Test from Browser Console
```javascript
// Open browser console (F12)
fetch('http://localhost:3000/test-print', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ printerIndex: 0 })
})
.then(r => r.json())
.then(console.log);
```

## 📱 Receipt Preview

To preview receipt on screen (for testing), add to `receipt-template.component.css`:

```css
/* Show on screen (remove for production) */
.receipt-container {
  display: block !important;
  width: 80mm;
  margin: 20px auto;
  border: 2px solid #ccc;
  background: white;
  padding: 10px;
}
```

## 🐛 Troubleshooting

### Print Dialog Doesn't Open
- ✅ Check browser allows pop-ups
- ✅ Try Ctrl+P to test browser print
- ✅ Check console for errors (F12)

### Receipt is Cut Off
- ✅ Set margins to "None" in print dialog
- ✅ Verify paper size matches (80mm)
- ✅ Try adjusting `width` in CSS

### Printer Not Detected (Direct Method)
- ✅ Ensure middleware is running
- ✅ Check USB connection
- ✅ Run middleware as Administrator (Windows)
- ✅ Check permissions (Linux/Mac)

### Items Not Showing
- ✅ Add items to cart first
- ✅ Check browser console for errors
- ✅ Verify `cartItems` has data

### Wrong Store Name
- ✅ Update both HTML template AND service
- ✅ Clear browser cache
- ✅ Restart dev server

## 📂 File Structure

```
src/pos/
├── components/
│   ├── pos-cart-sidebar/
│   │   ├── pos-cart-sidebar.component.ts    ← Print logic
│   │   └── pos-cart-sidebar.component.html  ← Print button
│   └── receipt-template/
│       ├── receipt-template.component.html  ← Receipt layout
│       ├── receipt-template.component.css   ← Print styles
│       └── receipt-template.component.ts    ← Receipt data
└── core/
    └── services/
        └── thermal-printer.service.ts       ← Printer service

thermal-printer-server/              ← Optional middleware
├── server.js                        ← ESC/POS server
├── package.json
└── README.md
```

## 🎯 Key Features Checklist

- [x] Auto-print on successful order
- [x] Manual print button
- [x] Browser-based printing (works with drivers)
- [x] Direct ESC/POS printing (optional)
- [x] Customizable receipt template
- [x] 80mm thermal paper support
- [x] 58mm thermal paper support (configurable)
- [x] Customer info on receipt
- [x] Item details with discounts
- [x] Payment and change calculation
- [x] Date and invoice number
- [x] Store information header
- [x] Thank you footer

## 🔐 Production Checklist

Before going live:
- [ ] Update all store information
- [ ] Test with actual thermal printer
- [ ] Configure paper size correctly
- [ ] Test all print scenarios
- [ ] Train staff on print button
- [ ] Set up middleware as service (if using direct print)
- [ ] Configure proper CORS settings
- [ ] Test print quality and readability
- [ ] Keep spare thermal paper rolls
- [ ] Document printer maintenance procedures

## 📞 Support Resources

- **Full Documentation**: `THERMAL_PRINTER_SETUP.md`
- **Middleware Docs**: `thermal-printer-server/README.md`
- **Browser Print**: Works with any printer driver
- **Direct Print**: Requires ESC/POS compatible printer

## 💡 Tips

1. **Keep it Simple**: Start with browser print method
2. **Test Early**: Print test receipts before going live
3. **Paper Quality**: Use good quality thermal paper
4. **Backup Method**: Always have browser print as fallback
5. **Staff Training**: Show staff how to use print button
6. **Maintenance**: Clean printer head regularly
7. **Paper Stock**: Keep extra thermal paper rolls

---

## 🎉 You're All Set!

Your POS system is now equipped with professional thermal printing!

**Next Steps:**
1. Customize store info
2. Test print some receipts  
3. Train your staff
4. Start selling! 🚀

For detailed documentation, see `THERMAL_PRINTER_SETUP.md`












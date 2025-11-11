# Invoice Feature Integration Guide

## Quick Start

The Invoice feature has been successfully created and integrated into your POS system. Here's how to access and use it:

## Accessing the Invoice Feature

### Option 1: Direct URL
Navigate to: `http://localhost:4200/app/pos/invoice`

### Option 2: Add Navigation Button to POS Layout

To add a button in the POS navigation bar, edit `pos-layout.component.html`:

```html
<!-- Add this button in the navbar section, around line 78 (near the Hold Orders button) -->
<button
  class="btn btn-outline-success"
  (click)="navigateToInvoice()"
>
  <i class="fa-solid fa-file-invoice me-1"></i>
  Create Invoice
</button>
```

Then add this method to `pos-layout.component.ts`:

```typescript
navigateToInvoice() {
  this.router.navigate(['/app/pos/invoice']);
}
```

And ensure Router is imported:
```typescript
import { Router } from '@angular/router';

// In constructor:
constructor(
  // ... other dependencies
  private router: Router
) { }
```

### Option 3: Add Tab Navigation

If you want to add tabs to switch between POS Items and Invoice, you can use PrimeNG TabView:

```html
<p-tabView>
  <p-tabPanel header="POS">
    <!-- Existing POS content -->
  </p-tabPanel>
  <p-tabPanel header="Invoice">
    <app-invoice></app-invoice>
  </p-tabPanel>
</p-tabView>
```

## Quick Test

1. **Start your development server:**
   ```bash
   npm start
   ```

2. **Navigate to the invoice page:**
   - URL: `http://localhost:4200/app/pos/invoice`

3. **Test the workflow:**
   - Select a customer
   - Search and add an item
   - Adjust quantity if needed
   - Click "Create Invoice"
   - View the preview
   - Test the print functionality

## Example API Response Structure

The invoice component expects these API structures:

### Customer API (Client)
```json
{
  "items": [
    {
      "id": 1,
      "name": "Customer Name"
    }
  ]
}
```

### Item API
```json
{
  "items": [
    {
      "id": 1,
      "name": "Product Name",
      "sku": "SKU123",
      "barcode": "123456789",
      "unitPrice": 100.00,
      "unitId": 1,
      "unitName": "pcs"
    }
  ]
}
```

### Invoice Creation Response
```json
{
  "result": {
    "voucherNumber": "INV-001",
    "id": 1
  }
}
```

## Troubleshooting

### Issue: Cannot find module errors
**Solution:** Run `npm install` to ensure all dependencies are installed

### Issue: Page not loading
**Solution:** 
1. Check that the server is running: `npm start`
2. Clear browser cache
3. Check console for errors

### Issue: API calls failing
**Solution:**
1. Verify API endpoints in your PosService
2. Check network tab for failed requests
3. Ensure you have proper authentication/authorization

## Next Steps

1. **Customize Company Info**: Edit `invoice-preview.component.ts` to update company details
2. **Style Adjustments**: Modify CSS files to match your branding
3. **Add Menu Item**: Add a permanent navigation item to your main menu
4. **Configure Tax Rate**: Update the tax rate in `invoice.component.ts` if needed

## Files Created

✅ Invoice Component Files:
- `src/pos/components/invoice/invoice.component.ts`
- `src/pos/components/invoice/invoice.component.html`
- `src/pos/components/invoice/invoice.component.css`
- `src/pos/components/invoice/invoice.component.spec.ts`

✅ Invoice Preview Component Files:
- `src/pos/components/invoice-preview/invoice-preview.component.ts`
- `src/pos/components/invoice-preview/invoice-preview.component.html`
- `src/pos/components/invoice-preview/invoice-preview.component.css`
- `src/pos/components/invoice-preview/invoice-preview.component.spec.ts`

✅ Updated Files:
- `src/pos/pos.module.ts` - Added component declarations
- `src/pos/pos-routing.module.ts` - Added invoice route

✅ Documentation:
- `INVOICE_FEATURE_README.md` - Comprehensive feature documentation
- `INVOICE_INTEGRATION_GUIDE.md` - This file

## Support

For detailed documentation, refer to `INVOICE_FEATURE_README.md`

Happy invoicing! 🎉


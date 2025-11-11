# Invoice Feature Documentation

## Overview
This document provides information about the newly created Invoice feature in the POS system.

## Features
- **Customer Selection**: Select or search for customers from a dropdown
- **Invoice Number**: Auto-generated invoice number (format: invoice-XXXXXX)
- **Purchase Order (PO) Number**: Optional field for PO reference
- **Date Fields**: Issue date and due date with date picker
- **Item Management**: 
  - Search and add items with autocomplete dropdown
  - Display item name and SKU
  - Adjust quantity and price per item
  - Support for item discounts
- **Invoice Summary**: 
  - Subtotal calculation
  - Tax calculation (currently set at 0%)
  - Total and Amount Due
- **Notes**: Optional notes section for additional information
- **Invoice Preview**: Preview the invoice after creation
- **Print Support**: Print invoice from preview

## File Structure

```
src/pos/components/
├── invoice/
│   ├── invoice.component.ts       # Main invoice component logic
│   ├── invoice.component.html     # Invoice form template
│   ├── invoice.component.css      # Invoice styles
│   └── invoice.component.spec.ts  # Unit tests
└── invoice-preview/
    ├── invoice-preview.component.ts       # Invoice preview logic
    ├── invoice-preview.component.html     # Invoice preview template
    ├── invoice-preview.component.css      # Preview styles
    └── invoice-preview.component.spec.ts  # Unit tests
```

## Navigation

To access the Invoice feature:

### URL Navigation
Navigate to: `http://your-domain/app/pos/invoice`

### Programmatic Navigation
```typescript
this.router.navigate(['/app/pos/invoice']);
```

### Adding to Menu
You can add a menu item to your navigation by adding a link like:
```html
<a routerLink="/app/pos/invoice">Create Invoice</a>
```

## Usage Instructions

### Creating an Invoice

1. **Select Customer** (Required)
   - Click on the "Select Customer" dropdown
   - Search for a customer by name
   - Select the customer from the list

2. **Enter Invoice Details**
   - The Invoice Number is auto-generated
   - Optionally enter a Purchase Order (PO) number
   - Select the Issue Date (defaults to today)
   - Select the Due Date (defaults to 7 days from today)

3. **Add Items**
   - Click in the "Type your item to add" search box
   - Start typing the item name, SKU, or barcode
   - Select an item from the dropdown that appears
   - The item will be added to the invoice with quantity 1
   - Adjust the quantity or price as needed
   - Remove items using the × button

4. **Review Summary**
   - Check the Subtotal, Tax, Total, and Amount Due
   - Review all items and their amounts

5. **Add Notes** (Optional)
   - Add any additional notes in the Notes section

6. **Create Invoice**
   - Click the "Create Invoice" button
   - The invoice will be saved and the preview will appear

### Invoice Preview

After creating an invoice, a preview dialog will appear showing:
- Company information (customizable)
- Invoice details (number, PO, dates)
- Customer information
- Itemized list with quantities, prices, and amounts
- Totals summary
- Notes (if provided)

### Actions Available

- **Print**: Print the invoice preview
- **Close**: Close the preview and return to create a new invoice

### Validation

The system validates:
- Customer selection is required
- At least one item must be added
- Quantities must be positive numbers
- Prices must be positive numbers

## API Integration

The invoice feature integrates with the following API endpoints:

### Load Customers
```typescript
this.purchaseService.getAllSuggestion('Client')
```

### Load Items
```typescript
this.posService.getAll('Item')
```

### Create Invoice
```typescript
this.posService.create(invoiceData, 'Invoice')
```

## Customization

### Company Information
To customize company information displayed in the invoice preview, edit:
```typescript
// src/pos/components/invoice-preview/invoice-preview.component.ts
get companyInfo() {
  return {
    name: 'Your Company Name',
    address: '123 Business Street',
    city: 'City, State 12345',
    phone: '(123) 456-7890',
    email: 'info@company.com'
  };
}
```

### Tax Rate
To change the tax rate, edit:
```typescript
// src/pos/components/invoice/invoice.component.ts
taxRate = 0; // Change to your desired tax rate (e.g., 10 for 10%)
```

### Styling
Customize the appearance by editing:
- `invoice.component.css` - Form styling
- `invoice-preview.component.css` - Preview styling

## Keyboard Shortcuts

Currently, the invoice form supports standard browser keyboard shortcuts:
- **Tab**: Navigate between fields
- **Enter**: Submit current field (in search, adds selected item)
- **Escape**: Close dropdowns

## Browser Support

The invoice feature is compatible with:
- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

## Known Limitations

1. Discount & Shipping link is currently non-functional (can be implemented as needed)
2. Tax rate is fixed at 0% (can be made configurable)
3. Company information in preview is hardcoded (can be made dynamic)

## Future Enhancements

Potential improvements for future versions:
- Discount and shipping configuration dialog
- Multiple tax rates support
- Company logo upload
- Invoice templates
- Email invoice functionality
- Export to PDF
- Invoice listing and search
- Edit existing invoices
- Payment tracking
- Recurring invoices

## Troubleshooting

### Issue: Items not loading
**Solution**: Check that the Item API endpoint is accessible and returning data

### Issue: Customer dropdown empty
**Solution**: Verify the Client API endpoint is accessible and returning customer data

### Issue: Invoice creation fails
**Solution**: Check browser console for error messages and verify API endpoint is accessible

### Issue: Preview not displaying
**Solution**: Ensure the invoice was created successfully and check for console errors

## Support

For issues or questions regarding the Invoice feature, please contact your development team or refer to the main POS system documentation.

## Version History

- **v1.0.0** (Initial Release)
  - Customer selection
  - Item search and addition
  - Invoice creation
  - Invoice preview
  - Print support


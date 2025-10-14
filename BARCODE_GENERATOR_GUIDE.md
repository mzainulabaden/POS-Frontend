# Barcode Generator - User Guide

## Overview
The barcode generator functionality has been added to the Item Creation screen. This feature allows you to generate unique barcodes, preview them, and assign them to item details.

## Features

### 1. **Generate Barcode**
- Automatically generates unique CODE128 format barcodes
- Each barcode is unique based on timestamp and random numbers
- Generates 13-digit barcode compatible with most barcode scanners

### 2. **Barcode Preview**
- Visual preview of the generated barcode
- Display of the barcode number in an easy-to-read format
- Canvas-based rendering using JsBarcode library

### 3. **Apply to Grid Rows**
- Select one or more rows in the item details grid
- Apply the generated barcode to all selected rows
- Each row can have its own unique barcode

### 4. **Download Barcode**
- Download the barcode image as PNG
- Useful for printing labels or documentation
- File naming format: `barcode_[barcode_number].png`

### 5. **Print Barcode**
- Direct print functionality
- Opens print dialog with barcode image
- Optimized layout for barcode printing

## How to Use

### Step 1: Open Item Creation Form
1. Navigate to Main Setups → Items
2. Click the "Create" button to open the item creation form

### Step 2: Add Item Details Rows
1. Fill in the basic item information (Name, SKU, Category, etc.)
2. Click "Add Row" to add item detail rows to the grid
3. Fill in the unit and pricing information for each row

### Step 3: Generate Barcode
1. Click the "Generate Barcode" button below the grid
2. In the Barcode Generator modal, click "Generate New Barcode"
3. A unique barcode will be generated and displayed

### Step 4: Apply Barcode to Rows
1. Select the row(s) in the grid where you want to apply the barcode
2. Click "Apply to Selected Rows" in the barcode modal
3. The barcode will be assigned to the selected rows
4. You can generate multiple different barcodes for different rows

### Step 5: Optional Actions
- **Download**: Click "Download" to save the barcode image
- **Print**: Click "Print" to print the barcode directly
- **Generate New**: Click "Generate New Barcode" to create another unique barcode

### Step 6: Save Item
1. Close the barcode generator modal
2. Review your item details in the grid
3. Click "Save" to create the item with barcodes

## Technical Details

### Barcode Format
- **Type**: CODE128
- **Length**: 13 digits
- **Generation**: Timestamp-based with random suffix
- **Display**: Visual barcode + numeric value

### Libraries Used
- **jsbarcode**: For barcode generation and rendering
- Installed via npm: `npm install jsbarcode --save --legacy-peer-deps`

### Component Files Modified
1. `create-item.component.ts` - Added barcode generation logic
2. `create-item.component.html` - Added barcode UI and modal
3. `create-item.component.css` - Added styling for barcode components

## Features Breakdown

### TypeScript Functions
- `generateBarcode()`: Generates a unique barcode number
- `generateBarcodeImage()`: Renders barcode on canvas
- `openBarcodeModal()`: Opens the barcode generator modal
- `applyBarcodeToGrid()`: Applies barcode to selected grid rows
- `downloadBarcodeImage()`: Downloads barcode as PNG
- `printBarcode()`: Prints barcode image

### UI Components
- Barcode generator button in the row controls
- Modal dialog for barcode operations
- Canvas element for barcode rendering
- Action buttons (Generate, Apply, Download, Print)
- Instructional messages

## Best Practices

1. **Generate Unique Barcodes**: Generate a new barcode for each different item unit
2. **Select Before Applying**: Always select the target row(s) before applying a barcode
3. **Review Before Saving**: Check the grid to ensure barcodes are correctly assigned
4. **Keep Records**: Download or print barcodes for your physical inventory

## Troubleshooting

### Issue: Barcode not appearing in grid
- **Solution**: Make sure you selected at least one row before clicking "Apply to Selected Rows"

### Issue: Cannot download barcode
- **Solution**: Generate a barcode first before attempting to download

### Issue: Print window doesn't open
- **Solution**: Check if your browser is blocking pop-ups

## Future Enhancements (Possible)
- Bulk barcode generation for multiple rows
- Custom barcode format selection (EAN-13, UPC, etc.)
- Barcode scanning integration
- Import barcodes from external sources
- Barcode validation and duplicate checking

---

**Version**: 1.0  
**Last Updated**: October 2025  
**Developer**: POS Frontend Team


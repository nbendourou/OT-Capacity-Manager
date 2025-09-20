import type { Rack } from './types';

// A robust function to parse floating-point numbers from various string formats,
// including those with commas as decimal separators or thousand separators.
export const flexibleParseFloat = (value: any): number => {
    if (value === null || value === undefined) return 0;
    let strValue = String(value).trim();
    if (strValue === '') return 0;
    
    // Handles formats like "1.234,56" (European) and "1,234.56" (American)
    const hasComma = strValue.includes(',');
    const hasDot = strValue.includes('.');
    
    if (hasComma && hasDot) {
      // If comma is the last separator, it's likely the decimal point
      if (strValue.lastIndexOf(',') > strValue.lastIndexOf('.')) {
        // European format: remove dots, replace comma with dot
        strValue = strValue.replace(/\./g, '').replace(',', '.');
      } else {
        // American format: remove commas
        strValue = strValue.replace(/,/g, '');
      }
    } else if (hasComma) {
      // Only has a comma, assume it's the decimal separator
      strValue = strValue.replace(',', '.');
    }

    const num = parseFloat(strValue);
    return isNaN(num) ? 0 : num;
};

export const getRackCapacity = (rack: Rack): number => {
    // The capacity is now ONLY determined by the individual rack's data from the sheet.
    // There are no longer global defaults for PDUs.
    return rack.Puissance_PDU > 0 ? rack.Puissance_PDU : 0;
};
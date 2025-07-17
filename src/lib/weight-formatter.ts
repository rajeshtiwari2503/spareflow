/**
 * Weight formatting utilities for consistent display across the application
 */

/**
 * Format weight for display in the UI
 * @param weightInKg - Weight in kilograms (as stored in database)
 * @returns Formatted weight string
 */
export function formatWeight(weightInKg: number | null | undefined): string {
  if (!weightInKg || weightInKg === 0) {
    return '0g'
  }
  
  // If weight is 1kg or more, display in kg
  if (weightInKg >= 1) {
    return `${weightInKg.toFixed(2)}kg`
  }
  
  // If weight is less than 1kg, display in grams
  const weightInGrams = Math.round(weightInKg * 1000)
  return `${weightInGrams}g`
}

/**
 * Parse weight input from user (supports both kg and g inputs)
 * @param input - User input string (e.g., "1kg", "500g", "1.5")
 * @returns Weight in kilograms for database storage
 */
export function parseWeightInput(input: string): number {
  if (!input || input.trim() === '') {
    return 0
  }
  
  const cleanInput = input.trim().toLowerCase()
  
  // Check if input ends with 'g' (grams)
  if (cleanInput.endsWith('g') && !cleanInput.endsWith('kg')) {
    const grams = parseFloat(cleanInput.replace('g', ''))
    return isNaN(grams) ? 0 : grams / 1000 // Convert grams to kg
  }
  
  // Check if input ends with 'kg' (kilograms)
  if (cleanInput.endsWith('kg')) {
    const kg = parseFloat(cleanInput.replace('kg', ''))
    return isNaN(kg) ? 0 : kg
  }
  
  // If no unit specified, assume kilograms
  const kg = parseFloat(cleanInput)
  return isNaN(kg) ? 0 : kg
}

/**
 * Get weight for calculations (with fallback)
 * @param weightInKg - Weight in kilograms from database
 * @param fallbackKg - Fallback weight in kg if original is null/undefined
 * @returns Weight in kilograms for calculations
 */
export function getCalculationWeight(weightInKg: number | null | undefined, fallbackKg: number = 0.5): number {
  return weightInKg || fallbackKg
}

/**
 * Format weight for shipment display (more detailed)
 * @param weightInKg - Weight in kilograms
 * @param showUnit - Whether to show the unit
 * @returns Formatted weight string
 */
export function formatShipmentWeight(weightInKg: number | null | undefined, showUnit: boolean = true): string {
  if (!weightInKg || weightInKg === 0) {
    return showUnit ? '0g' : '0'
  }
  
  if (weightInKg >= 1) {
    const formatted = weightInKg.toFixed(2)
    return showUnit ? `${formatted}kg` : formatted
  }
  
  const weightInGrams = Math.round(weightInKg * 1000)
  return showUnit ? `${weightInGrams}g` : weightInGrams.toString()
}
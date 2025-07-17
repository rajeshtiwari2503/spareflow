import { prisma } from '@/lib/prisma'

export interface BulkShipmentCSVRow {
  serviceCenterId: string
  serviceCenterName: string
  serviceCenterPincode: string
  serviceCenterAddress: string
  serviceCenterPhone: string
  numBoxes: number
  estimatedWeight: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  notes: string
  partIds?: string // Comma-separated part IDs
  partQuantities?: string // Comma-separated quantities
  partBoxNumbers?: string // Comma-separated box numbers
}

export interface BulkOperationProgress {
  total: number
  completed: number
  successful: number
  failed: number
  currentOperation: string
  errors: Array<{
    index: number
    error: string
  }>
}

export class BulkOperationManager {
  private progressCallback?: (progress: BulkOperationProgress) => void

  constructor(progressCallback?: (progress: BulkOperationProgress) => void) {
    this.progressCallback = progressCallback
  }

  /**
   * Parse CSV content into bulk shipment data
   */
  parseCSV(csvContent: string): BulkShipmentCSVRow[] {
    const lines = csvContent.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row')
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const requiredHeaders = [
      'serviceCenterId',
      'serviceCenterName', 
      'serviceCenterPincode',
      'serviceCenterAddress',
      'serviceCenterPhone',
      'numBoxes'
    ]

    // Validate required headers
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`)
    }

    const rows: BulkShipmentCSVRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = this.parseCSVLine(line)
      if (values.length < headers.length) {
        console.warn(`Row ${i + 1} has fewer columns than headers, skipping`)
        continue
      }

      const row: any = {}
      headers.forEach((header, index) => {
        const value = values[index]?.trim().replace(/"/g, '') || ''
        
        switch (header) {
          case 'numBoxes':
            row[header] = parseInt(value) || 1
            break
          case 'estimatedWeight':
            row[header] = parseFloat(value) || 1.0
            break
          case 'priority':
            row[header] = ['LOW', 'MEDIUM', 'HIGH'].includes(value.toUpperCase()) 
              ? value.toUpperCase() 
              : 'MEDIUM'
            break
          default:
            row[header] = value
        }
      })

      rows.push(row as BulkShipmentCSVRow)
    }

    return rows
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current)
    return result
  }

  /**
   * Generate CSV template for bulk shipment import
   */
  generateCSVTemplate(): string {
    const headers = [
      'serviceCenterId',
      'serviceCenterName',
      'serviceCenterPincode', 
      'serviceCenterAddress',
      'serviceCenterPhone',
      'numBoxes',
      'estimatedWeight',
      'priority',
      'notes',
      'partIds',
      'partQuantities',
      'partBoxNumbers'
    ]

    const sampleRow = [
      'sc_123456789',
      'Mumbai Service Center',
      '400001',
      '123 Main Street, Andheri East, Mumbai, Maharashtra',
      '9876543210',
      '2',
      '1.5',
      'MEDIUM',
      'Urgent delivery required',
      'part_123,part_456',
      '5,3',
      '1,2'
    ]

    return [
      headers.join(','),
      sampleRow.map(value => `"${value}"`).join(',')
    ].join('\n')
  }

  /**
   * Export shipments to CSV format
   */
  async exportShipmentsToCSV(brandId: string, filters?: {
    status?: string
    dateFrom?: Date
    dateTo?: Date
  }): Promise<string> {
    const whereClause: any = { brandId }
    
    if (filters?.status) {
      whereClause.status = filters.status
    }
    
    if (filters?.dateFrom || filters?.dateTo) {
      whereClause.createdAt = {}
      if (filters.dateFrom) {
        whereClause.createdAt.gte = filters.dateFrom
      }
      if (filters.dateTo) {
        whereClause.createdAt.lte = filters.dateTo
      }
    }

    const shipments = await prisma.shipment.findMany({
      where: whereClause,
      include: {
        serviceCenter: true,
        boxes: {
          include: {
            boxParts: {
              include: {
                part: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const headers = [
      'shipmentId',
      'serviceCenterId',
      'serviceCenterName',
      'numBoxes',
      'status',
      'createdAt',
      'totalWeight',
      'awbNumbers',
      'partCodes',
      'partNames'
    ]

    const rows = shipments.map(shipment => {
      const totalWeight = shipment.boxes.reduce((sum, box) => sum + (box.weight || 0), 0)
      const awbNumbers = shipment.boxes
        .map(box => box.awbNumber)
        .filter(Boolean)
        .join(';')
      
      const allParts = shipment.boxes.flatMap(box => 
        box.boxParts.map(bp => bp.part)
      )
      const partCodes = [...new Set(allParts.map(p => p.code))].join(';')
      const partNames = [...new Set(allParts.map(p => p.name))].join(';')

      return [
        shipment.id,
        shipment.serviceCenterId,
        shipment.serviceCenter.name,
        shipment.numBoxes.toString(),
        shipment.status,
        shipment.createdAt.toISOString(),
        totalWeight.toString(),
        awbNumbers,
        partCodes,
        partNames
      ].map(value => `"${value}"`).join(',')
    })

    return [headers.join(','), ...rows].join('\n')
  }

  /**
   * Validate bulk shipment data before processing
   */
  async validateBulkData(brandId: string, data: BulkShipmentCSVRow[]): Promise<{
    isValid: boolean
    errors: Array<{
      row: number
      field: string
      message: string
    }>
    warnings: Array<{
      row: number
      field: string
      message: string
    }>
  }> {
    const errors: Array<{ row: number; field: string; message: string }> = []
    const warnings: Array<{ row: number; field: string; message: string }> = []

    // Get all service center IDs to validate
    const serviceCenterIds = [...new Set(data.map(row => row.serviceCenterId))]
    const existingServiceCenters = await prisma.user.findMany({
      where: {
        id: { in: serviceCenterIds },
        role: 'SERVICE_CENTER'
      },
      select: { id: true }
    })
    const validServiceCenterIds = new Set(existingServiceCenters.map(sc => sc.id))

    // Get all part IDs if specified
    const allPartIds = new Set<string>()
    data.forEach(row => {
      if (row.partIds) {
        row.partIds.split(',').forEach(id => allPartIds.add(id.trim()))
      }
    })

    const existingParts = await prisma.part.findMany({
      where: {
        id: { in: Array.from(allPartIds) },
        brandId
      },
      select: { id: true }
    })
    const validPartIds = new Set(existingParts.map(p => p.id))

    // Validate each row
    data.forEach((row, index) => {
      const rowNumber = index + 1

      // Required field validation
      if (!row.serviceCenterId) {
        errors.push({
          row: rowNumber,
          field: 'serviceCenterId',
          message: 'Service Center ID is required'
        })
      } else if (!validServiceCenterIds.has(row.serviceCenterId)) {
        errors.push({
          row: rowNumber,
          field: 'serviceCenterId',
          message: 'Invalid Service Center ID'
        })
      }

      if (!row.serviceCenterPincode) {
        errors.push({
          row: rowNumber,
          field: 'serviceCenterPincode',
          message: 'Pincode is required'
        })
      } else if (!/^\d{6}$/.test(row.serviceCenterPincode)) {
        errors.push({
          row: rowNumber,
          field: 'serviceCenterPincode',
          message: 'Pincode must be 6 digits'
        })
      }

      if (!row.serviceCenterAddress) {
        errors.push({
          row: rowNumber,
          field: 'serviceCenterAddress',
          message: 'Address is required'
        })
      }

      if (!row.serviceCenterPhone) {
        errors.push({
          row: rowNumber,
          field: 'serviceCenterPhone',
          message: 'Phone number is required'
        })
      } else if (!/^\d{10}$/.test(row.serviceCenterPhone)) {
        warnings.push({
          row: rowNumber,
          field: 'serviceCenterPhone',
          message: 'Phone number should be 10 digits'
        })
      }

      if (row.numBoxes < 1 || row.numBoxes > 100) {
        errors.push({
          row: rowNumber,
          field: 'numBoxes',
          message: 'Number of boxes must be between 1 and 100'
        })
      }

      if (row.estimatedWeight && (row.estimatedWeight < 0.1 || row.estimatedWeight > 50)) {
        warnings.push({
          row: rowNumber,
          field: 'estimatedWeight',
          message: 'Weight should be between 0.1 and 50 kg'
        })
      }

      // Validate parts if specified
      if (row.partIds) {
        const partIds = row.partIds.split(',').map(id => id.trim())
        const quantities = row.partQuantities ? row.partQuantities.split(',').map(q => parseInt(q.trim())) : []
        const boxNumbers = row.partBoxNumbers ? row.partBoxNumbers.split(',').map(b => parseInt(b.trim())) : []

        if (quantities.length > 0 && quantities.length !== partIds.length) {
          errors.push({
            row: rowNumber,
            field: 'partQuantities',
            message: 'Number of quantities must match number of parts'
          })
        }

        if (boxNumbers.length > 0 && boxNumbers.length !== partIds.length) {
          errors.push({
            row: rowNumber,
            field: 'partBoxNumbers',
            message: 'Number of box numbers must match number of parts'
          })
        }

        partIds.forEach((partId, partIndex) => {
          if (!validPartIds.has(partId)) {
            errors.push({
              row: rowNumber,
              field: 'partIds',
              message: `Invalid part ID: ${partId}`
            })
          }

          const quantity = quantities[partIndex]
          if (quantity && (quantity < 1 || quantity > 1000)) {
            errors.push({
              row: rowNumber,
              field: 'partQuantities',
              message: `Invalid quantity for part ${partId}: ${quantity}`
            })
          }

          const boxNumber = boxNumbers[partIndex]
          if (boxNumber && (boxNumber < 1 || boxNumber > row.numBoxes)) {
            errors.push({
              row: rowNumber,
              field: 'partBoxNumbers',
              message: `Box number ${boxNumber} is invalid for ${row.numBoxes} boxes`
            })
          }
        })
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Process bulk operations with progress tracking
   */
  async processBulkOperation<T>(
    items: T[],
    processor: (item: T, index: number) => Promise<{ success: boolean; error?: string; result?: any }>,
    batchSize: number = 5
  ): Promise<{
    successful: number
    failed: number
    results: Array<{
      index: number
      success: boolean
      error?: string
      result?: any
    }>
  }> {
    const results: Array<{
      index: number
      success: boolean
      error?: string
      result?: any
    }> = []

    let successful = 0
    let failed = 0

    // Process in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, Math.min(i + batchSize, items.length))
      
      // Update progress
      if (this.progressCallback) {
        this.progressCallback({
          total: items.length,
          completed: i,
          successful,
          failed,
          currentOperation: `Processing batch ${Math.floor(i / batchSize) + 1}`,
          errors: results.filter(r => !r.success).map(r => ({
            index: r.index,
            error: r.error || 'Unknown error'
          }))
        })
      }

      // Process batch in parallel
      const batchPromises = batch.map(async (item, batchIndex) => {
        const globalIndex = i + batchIndex
        try {
          const result = await processor(item, globalIndex)
          return {
            index: globalIndex,
            ...result
          }
        } catch (error) {
          return {
            index: globalIndex,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Update counters
      batchResults.forEach(result => {
        if (result.success) {
          successful++
        } else {
          failed++
        }
      })

      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Final progress update
    if (this.progressCallback) {
      this.progressCallback({
        total: items.length,
        completed: items.length,
        successful,
        failed,
        currentOperation: 'Complete',
        errors: results.filter(r => !r.success).map(r => ({
          index: r.index,
          error: r.error || 'Unknown error'
        }))
      })
    }

    return {
      successful,
      failed,
      results
    }
  }

  /**
   * Generate bulk operation report
   */
  generateReport(results: {
    successful: number
    failed: number
    results: Array<{
      index: number
      success: boolean
      error?: string
      result?: any
    }>
  }): {
    summary: string
    details: string
    csvReport: string
  } {
    const { successful, failed, results: operationResults } = results
    const total = successful + failed

    const summary = `
Bulk Operation Summary:
- Total Operations: ${total}
- Successful: ${successful} (${((successful / total) * 100).toFixed(1)}%)
- Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)
    `.trim()

    const failedOperations = operationResults.filter(r => !r.success)
    const details = failedOperations.length > 0 
      ? `Failed Operations:\n${failedOperations.map(r => `- Row ${r.index + 1}: ${r.error}`).join('\n')}`
      : 'All operations completed successfully'

    // Generate CSV report
    const csvHeaders = ['Row', 'Status', 'Error', 'Result']
    const csvRows = operationResults.map(r => [
      (r.index + 1).toString(),
      r.success ? 'SUCCESS' : 'FAILED',
      r.error || '',
      r.result ? JSON.stringify(r.result) : ''
    ].map(value => `"${value}"`).join(','))

    const csvReport = [csvHeaders.join(','), ...csvRows].join('\n')

    return {
      summary,
      details,
      csvReport
    }
  }
}

export default BulkOperationManager
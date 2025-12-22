import { connectToDatabase } from '../lib/mongo.js'
import { Marksheet } from '../models.js'
import { applyResultNormalization } from './utils/resultUtils.js'
import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

// PDF cache to avoid regenerating identical PDFs
const pdfCache = new Map()
const CACHE_MAX_SIZE = 50
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Function to generate cache key
const getCacheKey = (marksheetId) => {
  return `pdf_${marksheetId}`
}

const convertPdfToJpeg = async (pdfBuffer) => {
  return sharp(pdfBuffer, { density: 180 })
    .jpeg({ quality: 85 })
    .toBuffer()
}

const LOGO_PATH = (() => {
  const logoPath = path.resolve(process.cwd(), 'public', 'images', 'mseclogo.png')
  return fs.existsSync(logoPath) ? logoPath : null
})()

// Function to expand department abbreviations to full names
const expandDepartmentName = (dept) => {
  const departmentMap = {
    'AI_DS': 'Artificial Intelligence and Data Science',
    'CSE': 'Computer Science and Engineering',
    'HNS': 'Humanities & Science (H&S)',
    'IT': 'Information Technology',
    'ECE': 'Electronics and Communication Engineering',
    'EEE': 'Electrical and Electronics Engineering',
    'MECH': 'Mechanical Engineering',
    'CIVIL': 'Civil Engineering'
  }
  
  return departmentMap[dept] || dept
}

const decodeBase64Image = (dataUrl) => {
  if (!dataUrl) return null
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  try {
    return Buffer.from(base64, 'base64')
  } catch (err) {
    console.warn('Failed to decode base64 image for PDF:', err.message)
    return null
  }
}

// Function to generate PDF using PDFKit
const generateMarksheetPDF = (marksheet, staffSignature, hodSignature, staffName, hodName) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 })
      const buffers = []
      const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
      
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers)
        resolve(pdfData)
      })

      // Header area with logo left and centered text block on the right
      const headerTop = doc.y
      const logoWidth = 85
      const logoHeight = 95
      const headerGap = 20
      const textBlockX = doc.page.margins.left + logoWidth + headerGap
      const textBlockWidth = contentWidth - logoWidth - headerGap

      if (LOGO_PATH) {
        doc.image(LOGO_PATH, doc.page.margins.left, headerTop, {
          width: logoWidth,
          height: logoHeight
        })
      }

      let textCursorY = headerTop + 5
      const writeHeaderLine = (text, fontSize, fontName = 'Helvetica', spacing = 3, textOptions = {}) => {
        doc.font(fontName).fontSize(fontSize)
          .text(text, textBlockX, textCursorY, {
            width: textBlockWidth,
            align: 'center',
            ...textOptions
          })
        textCursorY = doc.y + spacing
      }

      // Ensure college name fits on a single line by adjusting font size if needed
      const collegeName = 'MEENAKSHI SUNDARARAJAN ENGINEERING COLLEGE';
      let collegeFontSize = 15;
      const minCollegeFontSize = 9;
      doc.font('Helvetica-Bold');
      // Reduce font size until the text fits in the textBlockWidth
      while (doc.fontSize(collegeFontSize).widthOfString(collegeName) > textBlockWidth && collegeFontSize > minCollegeFontSize) {
        collegeFontSize -= 0.5;
      }
      writeHeaderLine(collegeName, collegeFontSize, 'Helvetica-Bold', 5)
      writeHeaderLine('(AN AUTONOMOUS INSTITUTION AFFILIATED TO ANNA UNIVERSITY)', 9, 'Helvetica', 3)
      writeHeaderLine('363, ARCOT ROAD, KODAMBAKKAM, CHENNAI-600024', 9, 'Helvetica', 6)
      writeHeaderLine('OFFICE OF THE CONTROLLER OF EXAMINATIONS', 11, 'Helvetica-Bold', 6)

      const examDate = new Date(marksheet.examinationDate)
      const monthYear = `${examDate.toLocaleString('default', { month: 'long' }).toUpperCase()} - ${examDate.getFullYear()}`
      const examText = `${(marksheet.examinationName || 'END SEMESTER EXAMINATIONS').toUpperCase()} - ${monthYear}`
      writeHeaderLine(examText, 10, 'Helvetica-Bold', 0)

      const headerBottom = Math.max(textCursorY, headerTop + logoHeight)

      doc.moveTo(doc.page.margins.left, headerBottom + 10)
        .lineTo(doc.page.width - doc.page.margins.right, headerBottom + 10)
        .lineWidth(1)
        .stroke()

      doc.y = headerBottom + 22

      // Student Information with better spacing
      const infoRows = [
        { label: 'Register Number', value: marksheet.studentDetails.regNumber },
        { label: 'Student Name', value: marksheet.studentDetails.name },
        { label: 'Department', value: `B.Tech ${expandDepartmentName(marksheet.studentDetails.department)}` },
        { label: 'Year/Semester', value: `${marksheet.studentDetails.year}${marksheet.semester ? `/${marksheet.semester}` : ''}` }
      ]

      const infoLabelWidth = 130
      const infoValueX = doc.page.margins.left + infoLabelWidth + 10
      const infoLineGap = 10
      
      infoRows.forEach((row) => {
        const labelOptions = { width: infoLabelWidth }
        const valueOptions = { width: contentWidth - infoLabelWidth - 10 }

        doc.font('Helvetica-Bold').fontSize(10.5)
        const labelHeight = doc.heightOfString(`${row.label}:`, labelOptions)

        doc.font('Helvetica').fontSize(10.5)
        const valueHeight = doc.heightOfString(row.value, valueOptions)

        const rowHeight = Math.max(labelHeight, valueHeight)
        const rowY = doc.y

        doc.font('Helvetica-Bold').fontSize(10.5)
          .text(`${row.label}:`, doc.page.margins.left, rowY, labelOptions)
        doc.font('Helvetica').fontSize(10.5)
          .text(row.value, infoValueX, rowY, valueOptions)

        doc.y = rowY + rowHeight + infoLineGap
      })

      doc.moveDown(1)

      const tableTop = doc.y + 8
      const footerReserve = 150
      const subjects = marksheet.subjects || []
      const baseRowHeight = 32
      const rowFontSize = 10.5
      const columnPaddingX = 10
      const columnPaddingY = 8

      const getResultColor = (value) => {
        const normalized = (value || '').toString().toLowerCase()
        if (normalized === 'pass') return '#15803d' // green
        if (normalized === 'fail') return '#b91c1c' // red
        if (normalized === 'absent') return '#b45309' // amber
        return '#111111'
      }

      const columns = [
        { key: 'sno', label: 'S.No', width: 55, align: 'center' },
        { key: 'course', label: 'Course', width: contentWidth - 225, align: 'left' },
        { key: 'mark', label: 'Marks', width: 85, align: 'center' },
        { key: 'result', label: 'Result', width: 85, align: 'center' }
      ]

      let currentX = doc.page.margins.left
      columns.forEach((col) => {
        col.x = currentX
        currentX += col.width
      })

      const measureCellHeight = (text, col) => {
        const cellText = `${text ?? ''}`
        return doc.heightOfString(cellText, {
          width: col.width - columnPaddingX * 2,
          align: col.align || 'left'
        })
      }

      const getRowHeight = (rowValues) => {
        let maxHeight = 0
        columns.forEach((col) => {
          doc.font('Helvetica').fontSize(rowFontSize)
          maxHeight = Math.max(maxHeight, measureCellHeight(rowValues[col.key], col))
        })
        return Math.max(baseRowHeight, maxHeight + columnPaddingY * 2)
      }

      let currentY = tableTop

      // Draw table header with better styling
      const headerRowHeight = 35
      
      // Draw header background
      doc.fillColor('#e8e8e8')
        .rect(doc.page.margins.left, currentY, contentWidth, headerRowHeight)
        .fill()
      doc.fillColor('#000000')
      
      // Draw header borders (thicker)
      doc.lineWidth(1.5)
        .rect(doc.page.margins.left, currentY, contentWidth, headerRowHeight)
        .stroke()
      doc.lineWidth(1)
      
      // Draw vertical lines for header
      columns.forEach((col, index) => {
        if (index < columns.length - 1) {
          doc.moveTo(col.x + col.width, currentY)
            .lineTo(col.x + col.width, currentY + headerRowHeight)
            .stroke()
        }
        
        // Draw header text with vertical centering
        doc.font('Helvetica-Bold').fontSize(11)
        const textHeight = doc.heightOfString(col.label, {
          width: col.width - columnPaddingX * 2,
          align: col.align || 'center'
        })
        const textY = currentY + (headerRowHeight - textHeight) / 2
        
        doc.text(col.label, col.x + columnPaddingX, textY, {
          width: col.width - columnPaddingX * 2,
          align: col.align || 'center',
          lineBreak: false
        })
      })

      currentY += headerRowHeight

      // Draw data rows
      subjects.forEach((subject, index) => {
        const rowValues = {
          sno: index + 1,
          course: subject.subjectName,
          mark: subject.marks,
          result: subject.result || '—'
        }

        const rowHeight = getRowHeight(rowValues)
        
        // Draw row border
        doc.rect(doc.page.margins.left, currentY, contentWidth, rowHeight).stroke()

        // Draw vertical lines and cell content
        columns.forEach((col, colIndex) => {
          if (colIndex < columns.length - 1) {
            doc.moveTo(col.x + col.width, currentY)
              .lineTo(col.x + col.width, currentY + rowHeight)
              .stroke()
          }
          
          // Draw cell text with vertical centering
          doc.font('Helvetica').fontSize(rowFontSize)
          const cellText = `${rowValues[col.key] ?? ''}`
          const textHeight = doc.heightOfString(cellText, {
            width: col.width - columnPaddingX * 2,
            align: col.align || 'left'
          })
          const textY = currentY + (rowHeight - textHeight) / 2
          
          if (col.key === 'result') {
            doc.fillColor(getResultColor(cellText))
          } else {
            doc.fillColor('#000000')
          }
          doc.text(cellText, col.x + columnPaddingX, textY, {
            width: col.width - columnPaddingX * 2,
            align: col.align || 'left',
            lineBreak: false
          })
        })

        currentY += rowHeight
      })

      const tableBottom = currentY + 12
      
      // Overall result and total subjects with better spacing
      doc.moveDown(0.5)
      const overallResultText = marksheet.overallResult || '—'
      doc.fontSize(11).font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Overall Result: ', doc.page.margins.left, tableBottom, {
          width: contentWidth / 2,
          align: 'left',
          continued: true
        })
      doc.fillColor(getResultColor(overallResultText))
        .text(overallResultText, {
          continued: false
        })
      doc.fillColor('#000000')
      doc.font('Helvetica').fontSize(11)
        .text(`Total Subjects: ${subjects.length}`, doc.page.margins.left + contentWidth / 2, tableBottom, {
          width: contentWidth / 2,
          align: 'right'
        })

      // Signature section with more spacing from content
      const signatureY = doc.page.height - doc.page.margins.bottom - 70
      const slotWidth = contentWidth / 2
      const signatureSlots = [
        { label: 'Signature of Staff', name: staffName || 'Staff Name', image: staffSignature },
        { label: 'Signature of HOD', name: hodName || 'HOD Name', image: hodSignature }
      ]

      signatureSlots.forEach((slot, index) => {
        const slotX = doc.page.margins.left + index * slotWidth
        const imageBuffer = decodeBase64Image(slot.image)
        if (imageBuffer) {
          doc.image(imageBuffer, slotX + 15, signatureY - 50, {
            fit: [slotWidth - 30, 42],
            align: 'center'
          })
        }

        // Signature line
        doc.lineWidth(0.5)
          .moveTo(slotX + 12, signatureY)
          .lineTo(slotX + slotWidth - 12, signatureY)
          .stroke()
        doc.lineWidth(1)

        // Signature label
        doc.fontSize(8.5).font('Helvetica')
          .text(slot.label, slotX + 12, signatureY + 5, {
            width: slotWidth - 24,
            align: 'center'
          })
        
        // Name below signature line with better spacing
        doc.fontSize(9).font('Helvetica-Bold')
          .text(slot.name, slotX + 12, signatureY + 18, {
            width: slotWidth - 24,
            align: 'center'
          })
      })

      // Footer timestamp
      doc.fontSize(7.5).fillColor('#666666')
        .text(`Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`, doc.page.margins.left, doc.page.height - doc.page.margins.bottom - 18, {
          width: contentWidth,
          align: 'right'
        })
      doc.fillColor('black')

      doc.end()
      
    } catch (error) {
      reject(error)
    }
  })
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    await connectToDatabase()
  } catch (dbErr) {
    console.error('DB connect error in generate-pdf API:', dbErr.message)
    return res.status(503).json({ success: false, error: 'Database connection failed' })
  }

  try {
    if (req.method === 'GET') {
      const { marksheetId, format } = req.query
      const outputFormat = (format || 'pdf').toLowerCase()

      if (!marksheetId) {
        return res.status(400).json({ success: false, error: 'marksheetId is required' })
      }

      // Get marksheet data
      const marksheetRaw = await Marksheet.findById(marksheetId)
        .populate('staffId')
        .populate('hodId')
        .lean()
      const marksheet = marksheetRaw ? applyResultNormalization(marksheetRaw) : null
      if (!marksheet) {
        return res.status(404).json({ success: false, error: 'Marksheet not found' })
      }

      // Check cache first
      const cacheKey = getCacheKey(marksheetId)
      const cached = pdfCache.get(cacheKey)
      
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log('Serving cached PDF for:', marksheetId)
        if (outputFormat === 'jpeg' || outputFormat === 'jpg' || outputFormat === 'image') {
          try {
            const jpegBuffer = await convertPdfToJpeg(cached.buffer)
            // Prevent browser caching so regenerated PDFs are always requested
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            res.setHeader('Pragma', 'no-cache')
            res.setHeader('Expires', '0')
            res.setHeader('Content-Type', 'image/jpeg')
            res.setHeader('Content-Disposition', `inline; filename="marksheet_${marksheet.studentDetails.regNumber}_${marksheet.marksheetId}.jpg"`)
            res.setHeader('Content-Length', jpegBuffer.length)
            res.setHeader('X-Cache', 'HIT')
            return res.status(200).send(jpegBuffer)
          } catch (err) {
            console.error('JPEG conversion error (cache):', err)
          }
        }
        // Prevent browser caching so regenerated PDFs are always requested
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="marksheet_${marksheet.studentDetails.regNumber}_${marksheet.marksheetId}.pdf"`)
        res.setHeader('Content-Length', cached.buffer.length)
        res.setHeader('X-Cache', 'HIT')
        return res.status(200).send(cached.buffer)
      }

      // Get signatures and names. Prefer signatures stored on the marksheet
      // (these are refreshed by the regenerate flow) and fall back to the
      // user's profile signature if the marksheet field is not present.
      const staffData = marksheet.staffId
      const staffSignature = (marksheet.staffSignature && marksheet.staffSignature.length > 0)
        ? marksheet.staffSignature
        : (staffData?.eSignature || null)
      const staffName = marksheet.staffName || staffData?.name || 'Staff Name'
      const hodData = marksheet.hodId
      const hodSignature = (marksheet.hodSignature && marksheet.hodSignature.length > 0)
        ? marksheet.hodSignature
        : (hodData?.eSignature || null)
      const hodName = marksheet.hodName || hodData?.name || 'HOD Name'
      const principalSignature = process.env.PRINCIPAL_SIGNATURE_URL || null

      try {
        // Generate PDF using PDFKit
        const pdfBuffer = await generateMarksheetPDF(marksheet, staffSignature, hodSignature, staffName, hodName)

        // Cache the PDF
        if (pdfCache.size >= CACHE_MAX_SIZE) {
          const firstKey = pdfCache.keys().next().value
          pdfCache.delete(firstKey)
        }
        pdfCache.set(cacheKey, {
          buffer: pdfBuffer,
          timestamp: Date.now()
        })

        if (outputFormat === 'jpeg' || outputFormat === 'jpg' || outputFormat === 'image') {
          try {
            const jpegBuffer = await convertPdfToJpeg(pdfBuffer)
            // Prevent browser caching so regenerated PDFs are always requested
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            res.setHeader('Pragma', 'no-cache')
            res.setHeader('Expires', '0')
            res.setHeader('Content-Type', 'image/jpeg')
            res.setHeader('Content-Disposition', `inline; filename="marksheet_${marksheet.studentDetails.regNumber}_${marksheet.marksheetId}.jpg"`)
            res.setHeader('Content-Length', jpegBuffer.length)
            res.setHeader('X-Cache', 'MISS')
            return res.status(200).send(jpegBuffer)
          } catch (err) {
            console.error('JPEG conversion error:', err)
          }
        }

        // Set response headers for PDF
        // Prevent browser caching so regenerated PDFs are always requested
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="marksheet_${marksheet.studentDetails.regNumber}_${marksheet.marksheetId}.pdf"`)
        res.setHeader('Content-Length', pdfBuffer.length)
        res.setHeader('X-Cache', 'MISS')

        return res.status(200).send(pdfBuffer)

      } catch (pdfError) {
        console.error('PDF generation error:', pdfError)
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to generate PDF',
          details: pdfError.message
        })
      }
    }

    if (req.method === 'POST') {
      const { marksheetId, returnType = 'base64' } = req.body

      if (!marksheetId) {
        return res.status(400).json({ success: false, error: 'marksheetId is required' })
      }

      const marksheetRaw = await Marksheet.findById(marksheetId).populate('staffId').populate('hodId')
      const marksheet = marksheetRaw ? applyResultNormalization(marksheetRaw) : null
      if (!marksheet) {
        return res.status(404).json({ success: false, error: 'Marksheet not found' })
      }

      const staffData = marksheet.staffId
      const staffSignature = (marksheet.staffSignature && marksheet.staffSignature.length > 0)
        ? marksheet.staffSignature
        : (staffData?.eSignature || null)
      const staffName = marksheet.staffName || staffData?.name || 'Staff Name'
      const hodData = marksheet.hodId
      const hodSignature = (marksheet.hodSignature && marksheet.hodSignature.length > 0)
        ? marksheet.hodSignature
        : (hodData?.eSignature || null)
      const hodName = marksheet.hodName || hodData?.name || 'HOD Name'
      const principalSignature = process.env.PRINCIPAL_SIGNATURE_URL || null

      try {
        const pdfBuffer = await generateMarksheetPDF(marksheet, staffSignature, hodSignature, staffName, hodName)

        if (returnType === 'base64') {
          const base64Pdf = pdfBuffer.toString('base64')
          return res.status(200).json({ 
            success: true, 
            pdfBase64: base64Pdf,
            filename: `marksheet_${marksheet.studentDetails.regNumber}_${marksheet.marksheetId}.pdf`
          })
        } else {
          return res.status(200).json({ 
            success: true, 
            message: 'Use GET method to download PDF directly' 
          })
        }

      } catch (pdfError) {
        console.error('PDF generation error:', pdfError)
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to generate PDF',
          details: pdfError.message
        })
      }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })

  } catch (err) {
    console.error('Generate PDF API error:', err)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// Allow other modules to invalidate the in-memory PDF cache for a marksheet
export const invalidatePdfCache = (marksheetId) => {
  try {
    const key = getCacheKey(marksheetId)
    if (pdfCache.has(key)) {
      pdfCache.delete(key)
      console.log('[generate-pdf] Invalidated PDF cache for:', marksheetId)
    }
  } catch (e) {
    console.warn('[generate-pdf] Failed to invalidate cache for:', marksheetId, e && e.message)
  }
}

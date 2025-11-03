
import PDFDocument from 'pdfkit';
import type { OrderWithItems } from '@shared/schema';

export class PDFService {
  generateInvoice(order: OrderWithItems): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Header
        doc.fontSize(20).text('INVOICE', { align: 'center' });
        doc.moveDown();

        // Order details
        doc.fontSize(10);
        doc.text(`Order Number: ${order.orderNumber}`, { align: 'right' });
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, { align: 'right' });
        doc.moveDown();

        // Customer details
        doc.fontSize(12).text('Bill To:', { underline: true });
        doc.fontSize(10);
        doc.text(order.customerName);
        if (order.customerEmail) doc.text(order.customerEmail);
        if (order.customerPhone) doc.text(order.customerPhone);
        doc.moveDown();

        // Items table header
        const tableTop = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Item', 50, tableTop);
        doc.text('SKU', 200, tableTop);
        doc.text('Qty', 320, tableTop);
        doc.text('Price', 380, tableTop);
        doc.text('Total', 480, tableTop, { align: 'right' });
        
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        
        // Items
        doc.font('Helvetica');
        let yPosition = tableTop + 25;
        
        order.items.forEach((item) => {
          doc.text(item.productName, 50, yPosition, { width: 140 });
          doc.text(item.sku, 200, yPosition);
          doc.text(item.quantity.toString(), 320, yPosition);
          doc.text(`$${item.unitPrice}`, 380, yPosition);
          doc.text(`$${item.subtotal}`, 480, yPosition, { align: 'right' });
          yPosition += 25;
        });

        // Total
        doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
        yPosition += 15;
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Total:', 380, yPosition);
        doc.text(`$${order.totalAmount}`, 480, yPosition, { align: 'right' });

        // Notes
        if (order.notes) {
          doc.moveDown(2);
          doc.fontSize(10).font('Helvetica');
          doc.text('Notes:', { underline: true });
          doc.text(order.notes);
        }

        // Footer
        doc.moveDown(3);
        doc.fontSize(8).text('Thank you for your business!', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export const pdfService = new PDFService();

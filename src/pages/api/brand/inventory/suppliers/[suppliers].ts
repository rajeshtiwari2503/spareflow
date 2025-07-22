import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma'; // adjust the import if needed

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supplierId = req.query.suppliers as string;
console.log("supplierId",supplierId);

 if (req.method === 'PUT') {
  const supplierId = req.query.suppliers as string;
  const {
    code,
    name,
    type,
    rating,
    reliability,
    leadTime,
    paymentTerms,
    currency,
    taxId,
    certifications, // expected array of certification IDs or new certification objects
    contact, // nested contact object for update
  } = req.body;

  if (!supplierId) {
    return res.status(400).json({ error: 'Supplier ID is required' });
  }

  try {
    const updateData: any = {};

    if (code) updateData.code = code;
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (rating !== undefined) updateData.rating = rating;
    if (reliability !== undefined) updateData.reliability = reliability;
    if (leadTime !== undefined) updateData.leadTime = leadTime;
    if (paymentTerms) updateData.paymentTerms = paymentTerms;
    if (currency) updateData.currency = currency;
    if (taxId !== undefined) updateData.taxId = taxId;

    // Handle certifications relation update
    if (certifications) {
      if (certifications.length === 0) {
        // Clear all certifications
        updateData.certifications = {
          set: []
        };
      } else if (typeof certifications[0] === 'string') {
        // Assuming certifications is array of certification IDs to set
        updateData.certifications = {
          set: certifications.map((id: string) => ({ id }))
        };
      } else if (typeof certifications[0] === 'object') {
        // Assuming certifications is array of new certification objects to create
        updateData.certifications = {
          create: certifications.map((cert: any) => ({
            // specify certification fields here, e.g. name, etc.
            name: cert.name,
            // ...other certification fields
          }))
        };
      }
    }

    // Update contact relation if nested object provided
    if (contact) {
      updateData.contact = {
        update: {
          person: contact.person,
          email: contact.email,
          phone: contact.phone,
          address: contact.address,
        }
      };
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      data: updatedSupplier,
      message: 'Supplier updated successfully',
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}


  else {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

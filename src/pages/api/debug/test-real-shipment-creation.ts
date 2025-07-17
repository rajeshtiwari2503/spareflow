import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateRobustAWB } from '@/lib/dtdc-robust-production';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
  }

  try {
    // Verify authentication - only SUPER_ADMIN can access this
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (authResult.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only super admin can access this endpoint' });
    }

    console.log('🧪 Testing real shipment creation with AWB generation...');

    // Step 1: Find a brand user to create test shipment
    const brandUser = await prisma.user.findFirst({
      where: { role: 'BRAND' },
      include: {
        brandProfile: true
      }
    });

    if (!brandUser) {
      return res.status(400).json({ error: 'No brand user found in database' });
    }

    console.log('✅ Found brand user:', brandUser.name);

    // Step 2: Find or create a test service center
    let serviceCenter = await prisma.user.findFirst({
      where: { 
        role: 'SERVICE_CENTER',
        email: 'test-service-center@spareflow.com'
      },
      include: {
        serviceCenterProfile: {
          include: {
            addresses: true
          }
        }
      }
    });

    if (!serviceCenter) {
      console.log('🔧 Creating test service center...');
      
      // Create test service center
      serviceCenter = await prisma.user.create({
        data: {
          name: 'Test Service Center Delhi',
          email: 'test-service-center@spareflow.com',
          phone: '9876543210',
          password: 'test-password-123', // Required field for user creation
          role: 'SERVICE_CENTER',
          serviceCenterProfile: {
            create: {
              centerName: 'Test Service Center Delhi',
              gstNumber: 'TEST123456789',
              addresses: {
                create: {
                  street: 'Test Address Line 1',
                  area: 'Connaught Place',
                  city: 'Delhi',
                  state: 'Delhi',
                  pincode: '110001',
                  country: 'India'
                }
              }
            }
          }
        },
        include: {
          serviceCenterProfile: {
            include: {
              addresses: true
            }
          }
        }
      });

      console.log('✅ Created test service center');
    }

    // Step 3: Ensure service center is authorized
    let authorization = await prisma.brandAuthorizedServiceCenter.findFirst({
      where: {
        brandId: brandUser.id,
        serviceCenterUserId: serviceCenter.id
      }
    });

    if (!authorization) {
      console.log('🔧 Creating authorization...');
      
      authorization = await prisma.brandAuthorizedServiceCenter.create({
        data: {
          brandId: brandUser.id,
          serviceCenterUserId: serviceCenter.id,
          status: 'Active'
        }
      });

      console.log('✅ Created authorization');
    }

    // Step 4: Find or create test parts
    let testPart = await prisma.part.findFirst({
      where: {
        brandId: brandUser.id,
        code: 'TEST-PART-001'
      }
    });

    if (!testPart) {
      console.log('🔧 Creating test part...');
      
      testPart = await prisma.part.create({
        data: {
          code: 'TEST-PART-001',
          name: 'Test Spare Part',
          description: 'Test spare part for AWB generation',
          price: 500,
          weight: 0.3, // 300g
          stockQuantity: 100,
          brandId: brandUser.id,
          category: 'ELECTRONIC',
          msl: 3 // Moisture Sensitivity Level instead of hsn
        }
      });

      console.log('✅ Created test part');
    }

    // Step 5: Create test shipment in database
    console.log('🚀 Creating test shipment...');
    
    const shipment = await prisma.shipment.create({
      data: {
        brandId: brandUser.id,
        recipientId: serviceCenter.id,
        recipientType: 'SERVICE_CENTER',
        numBoxes: 1, // Required field - number of boxes in shipment
        status: 'PENDING',
        priority: 'MEDIUM',
        notes: 'Test shipment for AWB generation',
        totalWeight: 0.5, // 500g
        totalValue: 1500,
        declaredValue: 1500,
        estimatedCost: 100,
        actualCost: 100,
        courierPartner: 'DTDC',
        recipientAddress: JSON.stringify({
          street: serviceCenter.serviceCenterProfile?.addresses?.[0]?.street || 'Test Address',
          area: serviceCenter.serviceCenterProfile?.addresses?.[0]?.area || 'Test Area',
          city: serviceCenter.serviceCenterProfile?.addresses?.[0]?.city || 'Delhi',
          state: serviceCenter.serviceCenterProfile?.addresses?.[0]?.state || 'Delhi',
          pincode: serviceCenter.serviceCenterProfile?.addresses?.[0]?.pincode || '110001',
          country: 'India'
        }),
        recipientPincode: serviceCenter.serviceCenterProfile?.addresses?.[0]?.pincode || '110001',
        insurance: JSON.stringify({ type: 'NONE' }),
        metadata: JSON.stringify({
          testShipment: true,
          createdForAwbTest: true
        })
      }
    });

    console.log('✅ Created shipment:', shipment.id);

    // Step 6: Create box and box parts
    console.log('📦 Creating box...');
    
    const box = await prisma.box.create({
      data: {
        shipmentId: shipment.id,
        boxNumber: '1',
        weight: 0.5,
        status: 'PENDING'
      }
    });

    await prisma.boxPart.create({
      data: {
        boxId: box.id,
        partId: testPart.id,
        quantity: 3
      }
    });

    console.log('✅ Created box and box parts');

    // Step 7: Update part stock
    await prisma.part.update({
      where: { id: testPart.id },
      data: { stockQuantity: testPart.stockQuantity - 3 }
    });

    // Step 8: Generate real AWB using DTDC integration
    console.log('🚀 Generating real AWB...');
    
    const recipientAddress = serviceCenter.serviceCenterProfile?.addresses?.[0];
    
    const awbRequest = {
      shipmentId: shipment.id,
      recipientName: serviceCenter.name,
      recipientPhone: serviceCenter.phone || '9876543210',
      recipientAddress: {
        street: recipientAddress?.street || 'Test Address Line 1',
        area: recipientAddress?.area || 'Connaught Place',
        city: recipientAddress?.city || 'Delhi',
        state: recipientAddress?.state || 'Delhi',
        pincode: recipientAddress?.pincode || '110001',
        country: 'India'
      },
      weight: 0.5,
      declaredValue: 1500,
      numBoxes: 1,
      priority: 'MEDIUM',
      shipmentType: 'FORWARD' as const
    };

    console.log('📦 AWB request prepared:', {
      shipmentId: awbRequest.shipmentId,
      recipientName: awbRequest.recipientName,
      recipientPincode: awbRequest.recipientAddress.pincode,
      weight: awbRequest.weight,
      declaredValue: awbRequest.declaredValue
    });

    const awbResult = await generateRobustAWB(awbRequest);
    
    console.log('📋 AWB generation result:', {
      success: awbResult.success,
      awbNumber: awbResult.awb_number,
      fallbackMode: awbResult.fallbackMode,
      error: awbResult.error
    });

    // Step 9: Update shipment with AWB details
    let updatedShipment;
    
    if (awbResult.success && awbResult.awb_number) {
      updatedShipment = await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          awbNumber: awbResult.awb_number,
          status: awbResult.fallbackMode ? 'AWB_PENDING' : 'AWB_GENERATED',
          dtdcData: JSON.stringify({
            ...awbResult.dtdcResponse,
            fallbackMode: awbResult.fallbackMode,
            processingTime: awbResult.processingTime,
            retryCount: awbResult.retryCount
          })
        }
      });

      console.log('✅ Updated shipment with AWB:', awbResult.awb_number);
    } else {
      updatedShipment = await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: 'AWB_FAILED',
          dtdcData: JSON.stringify({
            error: awbResult.error,
            fallbackMode: awbResult.fallbackMode,
            processingTime: awbResult.processingTime,
            retryCount: awbResult.retryCount
          })
        }
      });

      console.log('❌ AWB generation failed, updated shipment status');
    }

    // Step 10: Create notification
    try {
      await prisma.notification.create({
        data: {
          title: 'Test Shipment Created',
          message: `Test shipment ${shipment.id} created with AWB: ${awbResult.awb_number || 'Failed'}`,
          type: 'SHIPMENT',
          recipients: [serviceCenter.id],
          data: JSON.stringify({
            shipmentId: shipment.id,
            awbNumber: awbResult.awb_number,
            isTestShipment: true
          })
        }
      });

      console.log('✅ Created notification');
    } catch (error) {
      console.error('⚠️ Notification creation failed:', error);
    }

    // Step 11: Return comprehensive results
    const result = {
      success: true,
      testShipmentCreated: true,
      shipment: {
        id: updatedShipment.id,
        awbNumber: updatedShipment.awbNumber,
        status: updatedShipment.status,
        recipientName: serviceCenter.name,
        recipientType: 'SERVICE_CENTER',
        totalWeight: updatedShipment.totalWeight,
        totalValue: updatedShipment.totalValue,
        createdAt: updatedShipment.createdAt
      },
      awbGeneration: {
        success: awbResult.success,
        awbNumber: awbResult.awb_number,
        trackingUrl: awbResult.tracking_url,
        fallbackMode: awbResult.fallbackMode,
        processingTime: awbResult.processingTime,
        retryCount: awbResult.retryCount,
        error: awbResult.error
      },
      box: {
        id: box.id,
        boxNumber: box.boxNumber,
        weight: box.weight,
        status: box.status
      },
      testData: {
        brandUser: {
          id: brandUser.id,
          name: brandUser.name,
          email: brandUser.email
        },
        serviceCenter: {
          id: serviceCenter.id,
          name: serviceCenter.name,
          email: serviceCenter.email,
          address: recipientAddress
        },
        testPart: {
          id: testPart.id,
          code: testPart.code,
          name: testPart.name,
          stockAfter: testPart.stockQuantity - 3
        }
      },
      analysis: {
        realAwbGenerated: awbResult.success && !awbResult.fallbackMode,
        usingFallbackMode: awbResult.fallbackMode,
        shipmentCompletelyCreated: !!updatedShipment.awbNumber,
        canTrackShipment: !!awbResult.tracking_url,
        recommendations: awbResult.success && !awbResult.fallbackMode ? [
          '✅ Real AWB generation is working correctly',
          '✅ Shipment creation flow is complete',
          '✅ System is ready for production use'
        ] : awbResult.fallbackMode ? [
          '⚠️ AWB generation is using fallback mode',
          '⚠️ Check DTDC credentials and API configuration',
          '⚠️ Real AWB numbers are not being generated'
        ] : [
          '❌ AWB generation completely failed',
          '❌ Check DTDC API connectivity and credentials',
          '❌ System cannot create real shipments'
        ]
      }
    };

    return res.status(201).json(result);

  } catch (error) {
    console.error('❌ Test real shipment creation failed:', error);
    
    return res.status(500).json({
      error: 'Test real shipment creation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { refundToWallet } from '@/lib/wallet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fix_type, dry_run = true } = req.body;

    console.log(`Starting shipment issue fix. Type: ${fix_type}, Dry run: ${dry_run}`);

    const fixResults = {
      timestamp: new Date().toISOString(),
      fix_type,
      dry_run,
      fixes_applied: [] as any[],
      errors: [] as string[],
      summary: {
        total_issues_found: 0,
        issues_fixed: 0,
        issues_failed: 0
      }
    };

    if (fix_type === 'wallet_refunds' || fix_type === 'all') {
      console.log('Fixing wallet refund issues...');
      
      try {
        // Find cancelled shipments without proper refunds
        const cancelledShipments = await prisma.shipment.findMany({
          where: {
            status: 'CANCELLED'
          },
          include: {
            brand: {
              select: { id: true, name: true }
            }
          }
        });

        for (const shipment of cancelledShipments) {
          try {
            // Check for wallet transactions
            const walletTransactions = await prisma.walletTransaction.findMany({
              where: {
                OR: [
                  { reference: `SHIPMENT_${shipment.id}` },
                  { reference: shipment.id },
                  { purchaseOrderId: shipment.id }
                ]
              }
            });

            const debits = walletTransactions.filter(t => t.type === 'DEBIT');
            const credits = walletTransactions.filter(t => t.type === 'CREDIT');
            
            const totalDebited = debits.reduce((sum, t) => sum + t.amount, 0);
            const totalCredited = credits.reduce((sum, t) => sum + t.amount, 0);
            const refundDue = totalDebited - totalCredited;

            if (refundDue > 0) {
              fixResults.summary.total_issues_found++;

              if (!dry_run) {
                // Process the refund
                const refundResult = await refundToWallet(
                  shipment.brandId,
                  refundDue,
                  `Auto-fix: Refund for cancelled shipment ${shipment.id}`,
                  `AUTOFIX_REFUND_${shipment.id}`,
                  shipment.id
                );

                if (refundResult.success) {
                  fixResults.fixes_applied.push({
                    type: 'wallet_refund',
                    shipment_id: shipment.id,
                    brand_id: shipment.brandId,
                    brand_name: shipment.brand.name,
                    refund_amount: refundDue,
                    transaction_id: refundResult.transactionId,
                    new_balance: refundResult.newBalance
                  });
                  fixResults.summary.issues_fixed++;
                } else {
                  fixResults.errors.push(`Failed to refund ₹${refundDue} for shipment ${shipment.id}: ${refundResult.error}`);
                  fixResults.summary.issues_failed++;
                }
              } else {
                fixResults.fixes_applied.push({
                  type: 'wallet_refund',
                  shipment_id: shipment.id,
                  brand_id: shipment.brandId,
                  brand_name: shipment.brand.name,
                  refund_amount: refundDue,
                  action: 'DRY_RUN - Would refund this amount'
                });
              }
            }
          } catch (error) {
            fixResults.errors.push(`Error processing shipment ${shipment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            fixResults.summary.issues_failed++;
          }
        }
      } catch (error) {
        fixResults.errors.push(`Error in wallet refund fix: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (fix_type === 'orphaned_boxes' || fix_type === 'all') {
      console.log('Fixing orphaned boxes...');
      
      try {
        // Find orphaned boxes (boxes without shipments)
        const orphanedBoxes = await prisma.box.findMany({
          where: {
            shipment: null
          }
        });

        fixResults.summary.total_issues_found += orphanedBoxes.length;

        for (const box of orphanedBoxes) {
          try {
            if (!dry_run) {
              // Delete orphaned boxes and their parts
              await prisma.$transaction(async (tx) => {
                await tx.boxPart.deleteMany({
                  where: { boxId: box.id }
                });
                await tx.box.delete({
                  where: { id: box.id }
                });
              });

              fixResults.fixes_applied.push({
                type: 'orphaned_box_cleanup',
                box_id: box.id,
                box_number: box.boxNumber,
                awb_number: box.awbNumber,
                action: 'Deleted orphaned box and its parts'
              });
              fixResults.summary.issues_fixed++;
            } else {
              fixResults.fixes_applied.push({
                type: 'orphaned_box_cleanup',
                box_id: box.id,
                box_number: box.boxNumber,
                awb_number: box.awbNumber,
                action: 'DRY_RUN - Would delete this orphaned box'
              });
            }
          } catch (error) {
            fixResults.errors.push(`Error deleting orphaned box ${box.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            fixResults.summary.issues_failed++;
          }
        }
      } catch (error) {
        fixResults.errors.push(`Error in orphaned boxes fix: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (fix_type === 'wallet_references' || fix_type === 'all') {
      console.log('Fixing wallet transaction references...');
      
      try {
        // Find wallet transactions without proper references
        const transactionsWithoutRef = await prisma.walletTransaction.findMany({
          where: {
            AND: [
              { reference: null },
              { purchaseOrderId: null }
            ]
          },
          take: 100 // Limit to avoid overwhelming
        });

        fixResults.summary.total_issues_found += transactionsWithoutRef.length;

        for (const transaction of transactionsWithoutRef) {
          try {
            if (!dry_run) {
              // Update transaction with a generic reference
              await prisma.walletTransaction.update({
                where: { id: transaction.id },
                data: {
                  reference: `LEGACY_${transaction.id.slice(-8)}`
                }
              });

              fixResults.fixes_applied.push({
                type: 'wallet_reference_fix',
                transaction_id: transaction.id,
                user_id: transaction.userId,
                amount: transaction.amount,
                new_reference: `LEGACY_${transaction.id.slice(-8)}`,
                action: 'Added legacy reference'
              });
              fixResults.summary.issues_fixed++;
            } else {
              fixResults.fixes_applied.push({
                type: 'wallet_reference_fix',
                transaction_id: transaction.id,
                user_id: transaction.userId,
                amount: transaction.amount,
                action: 'DRY_RUN - Would add legacy reference'
              });
            }
          } catch (error) {
            fixResults.errors.push(`Error fixing transaction reference ${transaction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            fixResults.summary.issues_failed++;
          }
        }
      } catch (error) {
        fixResults.errors.push(`Error in wallet references fix: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (fix_type === 'negative_balances' || fix_type === 'all') {
      console.log('Fixing negative wallet balances...');
      
      try {
        // Find wallets with negative balances
        const negativeWallets = await prisma.wallet.findMany({
          where: {
            balance: {
              lt: 0
            }
          },
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        });

        fixResults.summary.total_issues_found += negativeWallets.length;

        for (const wallet of negativeWallets) {
          try {
            const negativeAmount = Math.abs(wallet.balance);
            
            if (!dry_run) {
              // Credit the wallet to bring balance to zero
              await prisma.$transaction(async (tx) => {
                await tx.wallet.update({
                  where: { id: wallet.id },
                  data: {
                    balance: 0,
                    totalEarned: { increment: negativeAmount }
                  }
                });

                await tx.walletTransaction.create({
                  data: {
                    userId: wallet.userId,
                    type: 'CREDIT',
                    amount: negativeAmount,
                    description: 'Auto-fix: Correction for negative balance',
                    reference: `AUTOFIX_NEGATIVE_${wallet.id}`,
                    balanceAfter: 0
                  }
                });
              });

              fixResults.fixes_applied.push({
                type: 'negative_balance_fix',
                wallet_id: wallet.id,
                user_id: wallet.userId,
                user_name: wallet.user.name,
                user_email: wallet.user.email,
                previous_balance: wallet.balance,
                correction_amount: negativeAmount,
                new_balance: 0,
                action: 'Corrected negative balance to zero'
              });
              fixResults.summary.issues_fixed++;
            } else {
              fixResults.fixes_applied.push({
                type: 'negative_balance_fix',
                wallet_id: wallet.id,
                user_id: wallet.userId,
                user_name: wallet.user.name,
                user_email: wallet.user.email,
                previous_balance: wallet.balance,
                correction_amount: negativeAmount,
                action: 'DRY_RUN - Would correct negative balance'
              });
            }
          } catch (error) {
            fixResults.errors.push(`Error fixing negative balance for wallet ${wallet.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            fixResults.summary.issues_failed++;
          }
        }
      } catch (error) {
        fixResults.errors.push(`Error in negative balances fix: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Fix operation completed. Fixed: ${fixResults.summary.issues_fixed}, Failed: ${fixResults.summary.issues_failed}`);

    return res.status(200).json({
      success: true,
      fix_results: fixResults
    });

  } catch (error) {
    console.error('Fix operation failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Fix operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
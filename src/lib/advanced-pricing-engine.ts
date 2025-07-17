import { prisma } from '@/lib/prisma';

export interface PricingRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
  conditions: PricingCondition[];
  actions: PricingAction[];
  validFrom: Date;
  validTo?: Date;
  brandId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingCondition {
  type: 'weight' | 'distance' | 'volume' | 'value' | 'destination' | 'service_type' | 'customer_tier' | 'time' | 'quantity';
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in' | 'contains';
  value: any;
  secondaryValue?: any; // For 'between' operator
}

export interface PricingAction {
  type: 'fixed_price' | 'percentage_discount' | 'fixed_discount' | 'markup' | 'tier_pricing' | 'dynamic_pricing';
  value: number;
  target: 'base_price' | 'shipping_cost' | 'total_cost' | 'margin';
  conditions?: PricingCondition[];
}

export interface PricingContext {
  weight: number;
  distance: number;
  volume: number;
  value: number;
  destinationPincode: string;
  serviceType: string;
  customerTier: string;
  shipmentTime: Date;
  quantity: number;
  brandId: string;
  customerId: string;
  baseCost: number;
}

export interface PricingResult {
  originalPrice: number;
  finalPrice: number;
  appliedRules: Array<{
    ruleId: string;
    ruleName: string;
    discount: number;
    markup: number;
    description: string;
  }>;
  breakdown: {
    baseCost: number;
    discounts: number;
    markups: number;
    taxes: number;
    finalCost: number;
  };
  margin: {
    amount: number;
    percentage: number;
  };
}

export class AdvancedPricingEngine {
  private static instance: AdvancedPricingEngine;
  
  private constructor() {}

  public static getInstance(): AdvancedPricingEngine {
    if (!AdvancedPricingEngine.instance) {
      AdvancedPricingEngine.instance = new AdvancedPricingEngine();
    }
    return AdvancedPricingEngine.instance;
  }

  // Calculate pricing based on context and rules
  async calculatePrice(context: PricingContext): Promise<PricingResult> {
    try {
      // Get applicable pricing rules
      const rules = await this.getApplicableRules(context);
      
      // Sort rules by priority (higher priority first)
      rules.sort((a, b) => b.priority - a.priority);

      let currentPrice = context.baseCost;
      const appliedRules: PricingResult['appliedRules'] = [];
      let totalDiscounts = 0;
      let totalMarkups = 0;

      // Apply rules in priority order
      for (const rule of rules) {
        const ruleResult = await this.applyRule(rule, context, currentPrice);
        
        if (ruleResult.applied) {
          currentPrice = ruleResult.newPrice;
          appliedRules.push({
            ruleId: rule.id,
            ruleName: rule.name,
            discount: ruleResult.discount,
            markup: ruleResult.markup,
            description: rule.description
          });
          
          totalDiscounts += ruleResult.discount;
          totalMarkups += ruleResult.markup;
        }
      }

      // Calculate margin
      const margin = {
        amount: currentPrice - context.baseCost,
        percentage: ((currentPrice - context.baseCost) / context.baseCost) * 100
      };

      return {
        originalPrice: context.baseCost,
        finalPrice: currentPrice,
        appliedRules,
        breakdown: {
          baseCost: context.baseCost,
          discounts: totalDiscounts,
          markups: totalMarkups,
          taxes: 0, // Can be extended for tax calculations
          finalCost: currentPrice
        },
        margin
      };
    } catch (error) {
      console.error('Error calculating price:', error);
      throw new Error('Failed to calculate pricing');
    }
  }

  // Get applicable rules based on context
  private async getApplicableRules(context: PricingContext): Promise<PricingRule[]> {
    try {
      // This would typically fetch from database
      // For now, we'll simulate with some default rules
      const mockRules: PricingRule[] = [
        {
          id: 'rule_1',
          name: 'Volume Discount',
          description: 'Discount for high volume shipments',
          priority: 100,
          isActive: true,
          conditions: [
            {
              type: 'weight',
              operator: 'greater_than',
              value: 10
            }
          ],
          actions: [
            {
              type: 'percentage_discount',
              value: 10,
              target: 'base_price'
            }
          ],
          validFrom: new Date('2024-01-01'),
          brandId: context.brandId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'rule_2',
          name: 'Distance Markup',
          description: 'Additional cost for long distance shipments',
          priority: 90,
          isActive: true,
          conditions: [
            {
              type: 'distance',
              operator: 'greater_than',
              value: 1000
            }
          ],
          actions: [
            {
              type: 'percentage_discount',
              value: -15, // Negative discount = markup
              target: 'base_price'
            }
          ],
          validFrom: new Date('2024-01-01'),
          brandId: context.brandId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'rule_3',
          name: 'Premium Customer Discount',
          description: 'Special pricing for premium customers',
          priority: 110,
          isActive: true,
          conditions: [
            {
              type: 'customer_tier',
              operator: 'equals',
              value: 'premium'
            }
          ],
          actions: [
            {
              type: 'percentage_discount',
              value: 15,
              target: 'total_cost'
            }
          ],
          validFrom: new Date('2024-01-01'),
          brandId: context.brandId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Filter rules based on conditions
      const applicableRules = [];
      
      for (const rule of mockRules) {
        if (await this.evaluateRuleConditions(rule.conditions, context)) {
          applicableRules.push(rule);
        }
      }

      return applicableRules;
    } catch (error) {
      console.error('Error getting applicable rules:', error);
      return [];
    }
  }

  // Evaluate if rule conditions are met
  private async evaluateRuleConditions(conditions: PricingCondition[], context: PricingContext): Promise<boolean> {
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    return true;
  }

  // Evaluate individual condition
  private evaluateCondition(condition: PricingCondition, context: PricingContext): boolean {
    const contextValue = this.getContextValue(condition.type, context);
    
    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;
      case 'greater_than':
        return contextValue > condition.value;
      case 'less_than':
        return contextValue < condition.value;
      case 'between':
        return contextValue >= condition.value && contextValue <= (condition.secondaryValue || 0);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(contextValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(contextValue);
      case 'contains':
        return String(contextValue).toLowerCase().includes(String(condition.value).toLowerCase());
      default:
        return false;
    }
  }

  // Get context value by type
  private getContextValue(type: PricingCondition['type'], context: PricingContext): any {
    switch (type) {
      case 'weight': return context.weight;
      case 'distance': return context.distance;
      case 'volume': return context.volume;
      case 'value': return context.value;
      case 'destination': return context.destinationPincode;
      case 'service_type': return context.serviceType;
      case 'customer_tier': return context.customerTier;
      case 'time': return context.shipmentTime;
      case 'quantity': return context.quantity;
      default: return null;
    }
  }

  // Apply individual rule
  private async applyRule(rule: PricingRule, context: PricingContext, currentPrice: number): Promise<{
    applied: boolean;
    newPrice: number;
    discount: number;
    markup: number;
  }> {
    let newPrice = currentPrice;
    let discount = 0;
    let markup = 0;
    let applied = false;

    for (const action of rule.actions) {
      const result = this.applyAction(action, context, newPrice);
      newPrice = result.newPrice;
      discount += result.discount;
      markup += result.markup;
      applied = true;
    }

    return { applied, newPrice, discount, markup };
  }

  // Apply individual action
  private applyAction(action: PricingAction, context: PricingContext, currentPrice: number): {
    newPrice: number;
    discount: number;
    markup: number;
  } {
    let newPrice = currentPrice;
    let discount = 0;
    let markup = 0;

    switch (action.type) {
      case 'fixed_price':
        newPrice = action.value;
        if (action.value < currentPrice) {
          discount = currentPrice - action.value;
        } else {
          markup = action.value - currentPrice;
        }
        break;

      case 'percentage_discount':
        const discountAmount = (currentPrice * Math.abs(action.value)) / 100;
        if (action.value > 0) {
          newPrice = currentPrice - discountAmount;
          discount = discountAmount;
        } else {
          newPrice = currentPrice + discountAmount;
          markup = discountAmount;
        }
        break;

      case 'fixed_discount':
        if (action.value > 0) {
          newPrice = Math.max(0, currentPrice - action.value);
          discount = Math.min(action.value, currentPrice);
        } else {
          newPrice = currentPrice + Math.abs(action.value);
          markup = Math.abs(action.value);
        }
        break;

      case 'markup':
        const markupAmount = (currentPrice * action.value) / 100;
        newPrice = currentPrice + markupAmount;
        markup = markupAmount;
        break;

      case 'tier_pricing':
        // Implement tier-based pricing logic
        newPrice = this.calculateTierPricing(action.value, context);
        if (newPrice < currentPrice) {
          discount = currentPrice - newPrice;
        } else {
          markup = newPrice - currentPrice;
        }
        break;

      case 'dynamic_pricing':
        // Implement dynamic pricing based on demand, time, etc.
        newPrice = this.calculateDynamicPricing(action.value, context, currentPrice);
        if (newPrice < currentPrice) {
          discount = currentPrice - newPrice;
        } else {
          markup = newPrice - currentPrice;
        }
        break;
    }

    return { newPrice, discount, markup };
  }

  // Calculate tier-based pricing
  private calculateTierPricing(tierConfig: any, context: PricingContext): number {
    // Implement tier pricing logic based on volume, customer type, etc.
    const baseTier = context.baseCost;
    
    if (context.weight > 20) return baseTier * 0.85; // 15% discount for heavy items
    if (context.weight > 10) return baseTier * 0.90; // 10% discount for medium items
    if (context.weight > 5) return baseTier * 0.95;  // 5% discount for light items
    
    return baseTier;
  }

  // Calculate dynamic pricing
  private calculateDynamicPricing(config: any, context: PricingContext, currentPrice: number): number {
    // Implement dynamic pricing based on time, demand, etc.
    const hour = context.shipmentTime.getHours();
    
    // Peak hours markup (9 AM - 6 PM)
    if (hour >= 9 && hour <= 18) {
      return currentPrice * 1.1; // 10% markup during peak hours
    }
    
    // Off-peak discount
    if (hour >= 22 || hour <= 6) {
      return currentPrice * 0.95; // 5% discount during off-peak hours
    }
    
    return currentPrice;
  }

  // Create new pricing rule
  async createPricingRule(rule: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<PricingRule> {
    try {
      // In a real implementation, this would save to database
      const newRule: PricingRule = {
        ...rule,
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Created pricing rule:', newRule);
      return newRule;
    } catch (error) {
      console.error('Error creating pricing rule:', error);
      throw new Error('Failed to create pricing rule');
    }
  }

  // Update pricing rule
  async updatePricingRule(ruleId: string, updates: Partial<PricingRule>): Promise<PricingRule> {
    try {
      // In a real implementation, this would update in database
      console.log('Updated pricing rule:', ruleId, updates);
      
      // Return mock updated rule
      return {
        id: ruleId,
        ...updates,
        updatedAt: new Date()
      } as PricingRule;
    } catch (error) {
      console.error('Error updating pricing rule:', error);
      throw new Error('Failed to update pricing rule');
    }
  }

  // Delete pricing rule
  async deletePricingRule(ruleId: string): Promise<boolean> {
    try {
      // In a real implementation, this would delete from database
      console.log('Deleted pricing rule:', ruleId);
      return true;
    } catch (error) {
      console.error('Error deleting pricing rule:', error);
      return false;
    }
  }

  // Get all pricing rules for a brand
  async getPricingRules(brandId: string): Promise<PricingRule[]> {
    try {
      // In a real implementation, this would fetch from database
      return [];
    } catch (error) {
      console.error('Error getting pricing rules:', error);
      return [];
    }
  }

  // Test pricing rule against sample data
  async testPricingRule(rule: PricingRule, testContext: PricingContext): Promise<PricingResult> {
    try {
      // Apply the rule to test context
      const mockRules = [rule];
      const currentPrice = testContext.baseCost;
      
      if (await this.evaluateRuleConditions(rule.conditions, testContext)) {
        const ruleResult = await this.applyRule(rule, testContext, currentPrice);
        
        return {
          originalPrice: testContext.baseCost,
          finalPrice: ruleResult.newPrice,
          appliedRules: [{
            ruleId: rule.id,
            ruleName: rule.name,
            discount: ruleResult.discount,
            markup: ruleResult.markup,
            description: rule.description
          }],
          breakdown: {
            baseCost: testContext.baseCost,
            discounts: ruleResult.discount,
            markups: ruleResult.markup,
            taxes: 0,
            finalCost: ruleResult.newPrice
          },
          margin: {
            amount: ruleResult.newPrice - testContext.baseCost,
            percentage: ((ruleResult.newPrice - testContext.baseCost) / testContext.baseCost) * 100
          }
        };
      }

      // Rule not applicable
      return {
        originalPrice: testContext.baseCost,
        finalPrice: testContext.baseCost,
        appliedRules: [],
        breakdown: {
          baseCost: testContext.baseCost,
          discounts: 0,
          markups: 0,
          taxes: 0,
          finalCost: testContext.baseCost
        },
        margin: {
          amount: 0,
          percentage: 0
        }
      };
    } catch (error) {
      console.error('Error testing pricing rule:', error);
      throw new Error('Failed to test pricing rule');
    }
  }
}

// Export singleton instance
export const advancedPricingEngine = AdvancedPricingEngine.getInstance();

// Utility functions
export async function calculateAdvancedPrice(context: PricingContext): Promise<PricingResult> {
  return advancedPricingEngine.calculatePrice(context);
}

export async function createPricingRule(rule: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<PricingRule> {
  return advancedPricingEngine.createPricingRule(rule);
}

export async function testPricingRule(rule: PricingRule, testContext: PricingContext): Promise<PricingResult> {
  return advancedPricingEngine.testPricingRule(rule, testContext);
}
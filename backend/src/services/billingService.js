import Stripe from 'stripe';
import { Organization } from '../models/Organization.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Billing Service
 * Handles all subscription, payment, and billing operations
 */

export class BillingService {
  // Tier pricing (in cents for Stripe)
  static TIER_PRICING = {
    starter: {
      monthly: 19900, // $199/month
      annual: 199900, // $1999/year
      limit: {
        properties: 1,
        beds: 50,
        staff: 2,
        apiCalls: 10000
      }
    },
    professional: {
      monthly: 49900, // $499/month
      annual: 499900, // $4999/year
      limit: {
        properties: 5,
        beds: 500,
        staff: 10,
        apiCalls: 50000
      }
    },
    enterprise: {
      monthly: 0, // Custom pricing
      annual: 0,
      limit: {
        properties: -1, // unlimited
        beds: -1,
        staff: -1,
        apiCalls: -1
      }
    }
  };

  /**
   * Create a new subscription for an organization
   */
  static async createSubscription(organizationId, tier, billingCycle = 'monthly', paymentMethodId) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Get pricing
      const tierPricing = this.TIER_PRICING[tier];
      if (!tierPricing) {
        throw new Error('Invalid tier');
      }

      const amount = billingCycle === 'monthly' ? tierPricing.monthly : tierPricing.annual;

      // Create or get Stripe customer
      let stripeCustomerId = organization.stripeCustomerId;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: organization.billingEmail || organization.email,
          name: organization.name,
          metadata: {
            organizationId: organizationId.toString()
          }
        });
        stripeCustomerId = customer.id;
        organization.stripeCustomerId = stripeCustomerId;
      }

      // Attach payment method if provided
      if (paymentMethodId) {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: stripeCustomerId
        });

        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId
          }
        });
      }

      // Create subscription
      if (tier === 'enterprise') {
        // Enterprise: Don't charge, create manual subscription
        const subscription = await Subscription.findOneAndUpdate(
          { organization: organizationId },
          {
            organization: organizationId,
            tier: 'enterprise',
            billingCycle: billingCycle,
            status: 'active',
            pricing: {
              monthlyAmount: 0,
              currency: 'USD'
            },
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            autoRenew: true
          },
          { upsert: true, new: true }
        );

        organization.tier = 'enterprise';
        organization.features = {
          multiProperty: true,
          advancedReports: true,
          apiAccess: true,
          customBranding: true,
          webhooks: true,
          smsNotifications: true,
          emailNotifications: true
        };
        organization.limits = this.TIER_PRICING.enterprise.limit;
      } else {
        // Create Stripe subscription
        const stripeSubscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
                  description: `PG Management - ${tier} tier`
                },
                recurring: {
                  interval: billingCycle === 'monthly' ? 'month' : 'year',
                  interval_count: 1
                },
                unit_amount: amount
              },
              quantity: 1
            }
          ],
          metadata: {
            organizationId: organizationId.toString(),
            tier: tier
          }
        });

        // Save subscription to database
        const subscription = await Subscription.findOneAndUpdate(
          { organization: organizationId },
          {
            organization: organizationId,
            tier: tier,
            billingCycle: billingCycle,
            status: 'active',
            pricing: {
              monthlyAmount: amount / 100,
              currency: 'USD'
            },
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            paymentMethod: paymentMethodId,
            autoRenew: stripeSubscription.automatic_tax.enabled,
            latestInvoiceId: stripeSubscription.latest_invoice
          },
          { upsert: true, new: true }
        );

        organization.stripeSubscriptionId = stripeSubscription.id;
        organization.tier = tier;
        organization.subscriptionStartDate = new Date();
        organization.nextBillingDate = new Date(stripeSubscription.current_period_end * 1000);
      }

      // Update organization features based on tier
      organization.features = this.getTierFeatures(tier);
      organization.limits = tierPricing.limit;
      organization.status = 'active';

      await organization.save();

      return {
        success: true,
        subscription: await Subscription.findOne({ organization: organizationId }),
        organization
      };
    } catch (error) {
      console.error('Create subscription error:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(organizationId, reason = '') {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      if (organization.stripeSubscriptionId) {
        await stripe.subscriptions.update(organization.stripeSubscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            cancellationReason: reason
          }
        });
      }

      const subscription = await Subscription.findOneAndUpdate(
        { organization: organizationId },
        {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason
        },
        { new: true }
      );

      organization.status = 'cancelled';
      organization.cancelledAt = new Date();
      organization.cancellationReason = reason;
      await organization.save();

      return { success: true, subscription };
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  }

  /**
   * Update payment method
   */
  static async updatePaymentMethod(organizationId, paymentMethodId) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      if (!organization.stripeCustomerId) {
        throw new Error('Organization not set up for payments');
      }

      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: organization.stripeCustomerId
      });

      await stripe.customers.update(organization.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      // Get card last4
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      organization.paymentMethod = {
        type: 'card',
        last4: paymentMethod.card.last4
      };
      await organization.save();

      return { success: true };
    } catch (error) {
      console.error('Update payment method error:', error);
      throw error;
    }
  }

  /**
   * Get invoice history for organization
   */
  static async getInvoiceHistory(organizationId, limit = 10) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      if (!organization.stripeCustomerId) {
        return [];
      }

      const invoices = await stripe.invoices.list({
        customer: organization.stripeCustomerId,
        limit: limit
      });

      return invoices.data.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        date: new Date(invoice.created * 1000),
        amount: invoice.amount_paid / 100,
        status: invoice.status,
        pdfUrl: invoice.invoice_pdf,
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null
      }));
    } catch (error) {
      console.error('Get invoice history error:', error);
      throw error;
    }
  }

  /**
   * Get tier features
   */
  static getTierFeatures(tier) {
    const features = {
      trial: {
        multiProperty: false,
        advancedReports: false,
        apiAccess: false,
        customBranding: false,
        webhooks: false,
        smsNotifications: false,
        emailNotifications: true
      },
      starter: {
        multiProperty: false,
        advancedReports: false,
        apiAccess: false,
        customBranding: false,
        webhooks: false,
        smsNotifications: false,
        emailNotifications: true
      },
      professional: {
        multiProperty: true,
        advancedReports: true,
        apiAccess: false,
        customBranding: false,
        webhooks: false,
        smsNotifications: true,
        emailNotifications: true
      },
      enterprise: {
        multiProperty: true,
        advancedReports: true,
        apiAccess: true,
        customBranding: true,
        webhooks: true,
        smsNotifications: true,
        emailNotifications: true
      }
    };

    return features[tier] || features.trial;
  }

  /**
   * Check if organization is within limits
   */
  static async checkLimits(organizationId) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const limits = organization.limits || {};
      const usage = organization.usage || {};

      const exceeded = [];

      if (limits.properties > 0 && usage.properties >= limits.properties) {
        exceeded.push('properties');
      }
      if (limits.beds > 0 && usage.beds >= limits.beds) {
        exceeded.push('beds');
      }
      if (limits.staff > 0 && usage.staff >= limits.staff) {
        exceeded.push('staff');
      }

      return {
        withinLimits: exceeded.length === 0,
        exceeded,
        limits,
        usage
      };
    } catch (error) {
      console.error('Check limits error:', error);
      throw error;
    }
  }

  /**
   * Update organization usage
   */
  static async updateUsage(organizationId, usageData) {
    try {
      const organization = await Organization.findByIdAndUpdate(
        organizationId,
        {
          $set: {
            'usage.properties': usageData.properties,
            'usage.beds': usageData.beds,
            'usage.tenants': usageData.tenants,
            'usage.invoices': usageData.invoices,
            'usage.apiCalls': usageData.apiCalls
          }
        },
        { new: true }
      );

      return organization;
    } catch (error) {
      console.error('Update usage error:', error);
      throw error;
    }
  }
}

export default BillingService;

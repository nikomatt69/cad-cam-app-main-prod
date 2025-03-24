import Stripe from 'stripe';
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from './api/auth';

export const config = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    basicPlanId: process.env.STRIPE_BASIC_PRICE_ID,
    proPlanId: process.env.STRIPE_PRO_PRICE_ID,
    enterprisePlanId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  }
} as const;



const stripe = new Stripe(config.stripe.secretKey as string, {
  apiVersion: '2025-02-24.acacia', // Use the latest API version
});

export default stripe;

// Price IDs for your subscription plans
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  BASIC: config.stripe.basicPlanId,
  PRO: config.stripe.proPlanId,
  ENTERPRISE: config.stripe.enterprisePlanId,
};

// Features available in each plan
export const PLAN_FEATURES = {
  [SUBSCRIPTION_PLANS.FREE]: {
    name: 'Free',
    price: '$0',
    features: [
      'Basic CAD functionality',
      '2 projects',
      'Limited components',
      'Community support',
    ],
    limits: {
      maxProjects: 2,
      maxComponents: 10,
      maxStorage: 100, // MB
    }
  },
  [SUBSCRIPTION_PLANS.BASIC as string]: {
    name: 'Basic',
    price: '$0.00',
    features: [
      'Full CAD functionality',
      '10 projects',
      'Unlimited components',
      'Email support',
      '1GB storage',
    ],
    limits: {
      maxProjects: 10,
      maxComponents: 100,
      maxStorage: 1024, // MB
    }
  },
  [SUBSCRIPTION_PLANS.PRO as string]: {
    name: 'Professional',
    price: '$4.99',
    features: [
      'Full CAD/CAM functionality',
      'Unlimited projects',
      'Advanced AI assistance',
      'Priority support',
      '10GB storage',
    ],
    limits: {
      maxProjects: 100,
      maxComponents: 1000,
      maxStorage: 10240, // MB
    }
  },
  
};

// Helper function to get plan by price ID
export function getPlanByPriceId(priceId: string) {
  const entry = Object.entries(SUBSCRIPTION_PLANS).find(([_, id]) => id === priceId);
  return entry ? entry[0] : null;
}

// Helper function to check if user has access to a feature
export function hasAccess(userPlan: string, featureLevel: string) {
  const plans = Object.keys(SUBSCRIPTION_PLANS);
  const userPlanIndex = plans.indexOf(userPlan);
  const featurePlanIndex = plans.indexOf(featureLevel);
  
  return userPlanIndex >= featurePlanIndex;
}

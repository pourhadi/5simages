export type ProcessingState = 'loading' | 'success' | 'error';

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
} 
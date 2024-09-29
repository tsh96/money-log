
export type IncomeTransaction = {
  id?: number;
  type: 'income';
  amount: number;
  description: string;
  date: number;
}

export type ExpenseTransaction = {
  id?: number;
  type: 'expense';
  amount: number;
  description: string;
  date: number;
  receipt?: {
    seller: string;
    tax: number;
    amount: number;
    items: {
      description: string;
      quantity: number;
      amount: number;
    }[];
  }
}

export type Transaction = IncomeTransaction | ExpenseTransaction

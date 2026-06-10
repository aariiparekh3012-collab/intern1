export interface PortfolioAccount {
  id: string;
  client_id: string;
  strategy_id: string;
  account_code: string;
  status: string;
  inception_date: string;
  created_at: string;
}

export interface Holding {
  id: string;
  portfolio_account_id: string;
  security_id: string;
  quantity: number;
  avg_cost_paise: number;
}

export interface CashLedgerEntry {
  id: string;
  portfolio_account_id: string;
  entry_type: string;
  amount_paise: number;
  balance_paise: number;
  posted_on: string;
}

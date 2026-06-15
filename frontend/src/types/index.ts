export interface User {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  mobile?: string;
  role: 'admin' | 'manager' | 'operator';
  is_active?: boolean;
  last_login?: string;
}

export interface Customer {
  id: string;
  customer_name: string;
  mobile?: string;
  address?: string;
  gst_number?: string;
  credit_limit: number;
  outstanding_amount: number;
  is_active?: boolean;
  created_at?: string;
}

export interface Supplier {
  id: string;
  supplier_name: string;
  mobile?: string;
  address?: string;
  gst_number?: string;
  outstanding_amount: number;
  is_active?: boolean;
}

export interface Product {
  id: string;
  product_name: string;
  category?: string;
  unit: string;
  hsn_code?: string;
  gst_percentage: number;
  purchase_rate: number;
  wholesale_rate: number;
  retail_rate: number;
  minimum_stock: number;
  current_stock: number;
  barcode?: string;
  is_active?: boolean;
}

export interface SaleItem {
  id?: string;
  product_id?: string;
  product_name: string;
  unit: string;
  quantity: number;
  rate: number;
  discount_percentage: number;
  discount_amount: number;
  gst_percentage: number;
  gst_amount: number;
  amount: number;
}

export interface Sale {
  id: string;
  bill_number: string;
  bill_date: string;
  bill_time: string;
  customer_id?: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_address?: string;
  customer_gst?: string;
  subtotal: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
  taxable_amount: number;
  gst_amount: number;
  grand_total: number;
  round_off: number;
  payment_mode: string;
  user_id?: string;
  user_name?: string;
  notes?: string;
  items?: SaleItem[];
}

export interface PurchaseItem {
  id?: string;
  product_id?: string;
  product_name: string;
  unit: string;
  quantity: number;
  rate: number;
  gst_percentage: number;
  gst_amount: number;
  amount: number;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  purchase_date: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_mobile?: string;
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  payment_mode?: string;
  user_name?: string;
  notes?: string;
  items?: PurchaseItem[];
}

export interface CompanySettings {
  id: string;
  company_name: string;
  address?: string;
  mobile?: string;
  email?: string;
  gst_number?: string;
  pan_number?: string;
  logo_url?: string;
  financial_year_start?: string;
  financial_year_end?: string;
  thermal_printer?: string;
  a5_printer?: string;
  auto_backup_enabled?: boolean;
  backup_frequency?: string;
}

export interface DashboardStats {
  todaySales: { total: number; count: number };
  monthlySales: { total: number; count: number };
  yearlySales: { total: number; count: number };
  totalCustomers: number;
  totalProducts: number;
  stockValue: number;
  pendingPayments: number;
  lowStockProducts: number;
  recentSales: any[];
  topProducts: any[];
  monthlyRevenue: any[];
}

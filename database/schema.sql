-- Student Xerox Billing Software - PostgreSQL Schema
-- Rice Wholesale & Retail Billing System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    mobile VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'manager', 'operator')),
    is_active BOOLEAN DEFAULT true,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(200) NOT NULL,
    mobile VARCHAR(20),
    address TEXT,
    gst_number VARCHAR(50),
    credit_limit DECIMAL(12,2) DEFAULT 0,
    outstanding_amount DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_name VARCHAR(200) NOT NULL,
    mobile VARCHAR(20),
    address TEXT,
    gst_number VARCHAR(50),
    outstanding_amount DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'Kg',
    hsn_code VARCHAR(20),
    gst_percentage DECIMAL(5,2) DEFAULT 0,
    purchase_rate DECIMAL(12,2) DEFAULT 0,
    wholesale_rate DECIMAL(12,2) DEFAULT 0,
    retail_rate DECIMAL(12,2) DEFAULT 0,
    minimum_stock DECIMAL(12,2) DEFAULT 0,
    current_stock DECIMAL(12,2) DEFAULT 0,
    barcode VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bill number sequence
CREATE TABLE bill_sequences (
    financial_year VARCHAR(20) PRIMARY KEY,
    last_number INTEGER DEFAULT 0
);

-- Sales (Bills) table
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    bill_time TIME NOT NULL DEFAULT CURRENT_TIME,
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(200),
    customer_mobile VARCHAR(20),
    customer_address TEXT,
    customer_gst VARCHAR(50),
    subtotal DECIMAL(12,2) DEFAULT 0,
    discount_type VARCHAR(10) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    taxable_amount DECIMAL(12,2) DEFAULT 0,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    grand_total DECIMAL(12,2) DEFAULT 0,
    round_off DECIMAL(5,2) DEFAULT 0,
    payment_mode VARCHAR(20) CHECK (payment_mode IN ('cash', 'upi', 'card', 'bank_transfer', 'credit')),
    user_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sale Items table
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    unit VARCHAR(50) DEFAULT 'Kg',
    quantity DECIMAL(12,3) NOT NULL,
    rate DECIMAL(12,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    gst_percentage DECIMAL(5,2) DEFAULT 0,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    amount DECIMAL(12,2) NOT NULL
);

-- Purchases table
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_number VARCHAR(50) UNIQUE NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id UUID REFERENCES suppliers(id),
    supplier_name VARCHAR(200),
    supplier_mobile VARCHAR(20),
    subtotal DECIMAL(12,2) DEFAULT 0,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    grand_total DECIMAL(12,2) DEFAULT 0,
    payment_mode VARCHAR(20),
    user_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Items table
CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    unit VARCHAR(50) DEFAULT 'Kg',
    quantity DECIMAL(12,3) NOT NULL,
    rate DECIMAL(12,2) NOT NULL,
    gst_percentage DECIMAL(5,2) DEFAULT 0,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    amount DECIMAL(12,2) NOT NULL
);

-- Stock Transactions table
CREATE TABLE stock_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'return')),
    reference_id UUID,
    quantity DECIMAL(12,3) NOT NULL,
    rate DECIMAL(12,2),
    balance_quantity DECIMAL(12,3),
    notes TEXT,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_type VARCHAR(20) NOT NULL CHECK (reference_type IN ('sale', 'purchase')),
    reference_id UUID NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_mode VARCHAR(20) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(100),
    description TEXT,
    amount DECIMAL(12,2) NOT NULL,
    payment_mode VARCHAR(20),
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Company settings
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(200) NOT NULL DEFAULT 'Student Xerox',
    address TEXT,
    mobile VARCHAR(20),
    email VARCHAR(200),
    gst_number VARCHAR(50),
    pan_number VARCHAR(20),
    logo_url TEXT,
    financial_year_start DATE,
    financial_year_end DATE,
    thermal_printer VARCHAR(100),
    a5_printer VARCHAR(100),
    auto_backup_enabled BOOLEAN DEFAULT false,
    backup_frequency VARCHAR(20),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backups table
CREATE TABLE backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    backup_type VARCHAR(20) DEFAULT 'manual',
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sales_bill_number ON sales(bill_number);
CREATE INDEX idx_sales_bill_date ON sales(bill_date);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_products_name ON products(product_name);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_customers_mobile ON customers(mobile);
CREATE INDEX idx_stock_transactions_product ON stock_transactions(product_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Default admin user (password: admin123)
INSERT INTO users (username, password_hash, full_name, role) VALUES
('admin', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkfAjkMBcGmPmGqYQE4zVZnJmZbRq', 'Administrator', 'admin');

-- Default company settings
INSERT INTO company_settings (company_name, address, mobile) VALUES ('Student Xerox', 'Therikiyur, Ayyampalayam, Trichy - 621005', '9876543210');

-- Default settings
INSERT INTO settings (setting_key, setting_value) VALUES
('financial_year', '2026-27'),
('invoice_prefix', 'BT'),
('default_payment_mode', 'cash'),
('tax_enabled', 'true'),
('currency_symbol', '₹');

CREATE DATABASE IF NOT EXISTS conta_sanlla;
USE conta_sanlla;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  type ENUM('bank', 'cash', 'investment', 'credit') NOT NULL,
  initial_balance DECIMAL(15,2) DEFAULT 0.00,
  image_path VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('income', 'expense', 'transfer') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  source_account_id INT NULL,
  target_account_id INT NULL,
  category_id INT NULL,
  date DATETIME NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_account_id) REFERENCES accounts(id),
  FOREIGN KEY (target_account_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Sample user
INSERT INTO users (email, password, name) VALUES
('christianllanos1@gmail.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Christian Llanos'); -- password: password

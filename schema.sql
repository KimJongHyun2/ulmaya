-- H2 database schema for ulmaya.
-- This file only defines the initial relational database design.
-- Firebase-related application code is intentionally left unchanged.

-- member: Stores Kakao-authenticated user profile information.
CREATE TABLE member (
  member_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  kakao_id VARCHAR(50) UNIQUE NOT NULL,
  nickname VARCHAR(100),
  email VARCHAR(255),
  profile_image VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- receipt: Stores receipt metadata and raw OCR text uploaded by a member.
CREATE TABLE receipt (
  receipt_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT NOT NULL,
  store_name VARCHAR(100),
  receipt_date TIMESTAMP,
  total_amount INT,
  raw_ocr_text CLOB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES member (member_id)
);

-- receipt_item: Stores itemized menu/product rows parsed from a receipt.
CREATE TABLE receipt_item (
  item_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  receipt_id BIGINT NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  unit_price INT DEFAULT 0,
  quantity INT DEFAULT 1,
  amount INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receipt_id) REFERENCES receipt (receipt_id) ON DELETE CASCADE
);

-- settlement: Stores per-person settlement amounts for a receipt.
CREATE TABLE settlement (
  settlement_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  receipt_id BIGINT NOT NULL,
  member_name VARCHAR(100) NOT NULL,
  amount INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receipt_id) REFERENCES receipt (receipt_id) ON DELETE CASCADE
);

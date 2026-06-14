-- H2 database schema for the ulmaya ERD.
-- Menu items are weak entities and must always be referenced with receipt_id.

DROP TABLE IF EXISTS settlement_results;
DROP TABLE IF EXISTS settlement_requests;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS receipts;
DROP TABLE IF EXISTS participants;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  user_id VARCHAR(64) PRIMARY KEY,
  kakao_id VARCHAR(100) UNIQUE,
  nickname VARCHAR(100),
  profile_image VARCHAR(500),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stores (
  store_id VARCHAR(64) PRIMARY KEY,
  store_name VARCHAR(200) NOT NULL,
  address VARCHAR(500),
  phone VARCHAR(50)
);

CREATE TABLE participants (
  participant_id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact VARCHAR(100),
  kakao_linked BOOLEAN NOT NULL DEFAULT FALSE,
  profile_image VARCHAR(500)
);

CREATE TABLE receipts (
  receipt_id VARCHAR(64) PRIMARY KEY,
  image_path VARCHAR(1000),
  ocr_raw_text CLOB,
  total_amount INTEGER NOT NULL DEFAULT 0,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  store_id VARCHAR(64),
  user_id VARCHAR(64),
  CONSTRAINT fk_receipts_store
    FOREIGN KEY (store_id)
    REFERENCES stores (store_id),
  CONSTRAINT fk_receipts_user
    FOREIGN KEY (user_id)
    REFERENCES users (user_id)
);

CREATE TABLE menu_items (
  menu_item_id BIGINT NOT NULL,
  receipt_id VARCHAR(64) NOT NULL,
  menu_name VARCHAR(200) NOT NULL,
  unit_price INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount INTEGER NOT NULL DEFAULT 0,
  edited BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT pk_menu_items
    PRIMARY KEY (menu_item_id, receipt_id),
  CONSTRAINT fk_menu_items_receipt
    FOREIGN KEY (receipt_id)
    REFERENCES receipts (receipt_id)
    ON DELETE CASCADE
);

CREATE TABLE settlement_requests (
  settlement_request_id VARCHAR(128) PRIMARY KEY,
  menu_item_id BIGINT NOT NULL,
  receipt_id VARCHAR(64) NOT NULL,
  participant_id BIGINT NOT NULL,
  requested_amount INTEGER NOT NULL DEFAULT 0,
  request_method VARCHAR(50) NOT NULL DEFAULT '카카오페이',
  request_status VARCHAR(20) NOT NULL DEFAULT '대기',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  request_message VARCHAR(1000),
  CONSTRAINT fk_settlement_requests_menu
    FOREIGN KEY (menu_item_id, receipt_id)
    REFERENCES menu_items (menu_item_id, receipt_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_settlement_requests_participant
    FOREIGN KEY (participant_id)
    REFERENCES participants (participant_id)
);

CREATE TABLE settlement_results (
  settlement_result_id VARCHAR(128) PRIMARY KEY,
  menu_item_id BIGINT NOT NULL,
  receipt_id VARCHAR(64) NOT NULL,
  participant_id BIGINT NOT NULL,
  settlement_amount INTEGER NOT NULL DEFAULT 0,
  invite_status VARCHAR(20) NOT NULL DEFAULT '대기',
  transfer_status VARCHAR(20) NOT NULL DEFAULT '대기',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP,
  CONSTRAINT fk_settlement_results_menu
    FOREIGN KEY (menu_item_id, receipt_id)
    REFERENCES menu_items (menu_item_id, receipt_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_settlement_results_participant
    FOREIGN KEY (participant_id)
    REFERENCES participants (participant_id)
);

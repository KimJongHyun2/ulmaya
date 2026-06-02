-- Firestore -> Relational mapping summary
-- settlementSessions (single Firestore document) maps to:
-- settlement_room: one session/room per receipt flow
-- participant: all selected participants in the session
-- menu_item: OCR or edited menu rows in the receipt
-- menu_participant: many-to-many assignment between menu items and participants
-- settlement_result: per-participant calculated amount and send status

CREATE TABLE settlement_room (
  settlement_room_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  firestore_session_id VARCHAR(128) NOT NULL UNIQUE,
  store_name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  visited_at VARCHAR(50) NOT NULL,
  summary_date VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE participant (
  participant_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  settlement_room_id BIGINT NOT NULL,
  external_user_id VARCHAR(128),
  name VARCHAR(100) NOT NULL,
  avatar VARCHAR(50) NOT NULL,
  image_url VARCHAR(500),
  is_me BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_participant_room
    FOREIGN KEY (settlement_room_id)
    REFERENCES settlement_room (settlement_room_id)
    ON DELETE CASCADE
);

CREATE TABLE menu_item (
  menu_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  settlement_room_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  price INTEGER NOT NULL,
  is_nbbang BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_menu_item_room
    FOREIGN KEY (settlement_room_id)
    REFERENCES settlement_room (settlement_room_id)
    ON DELETE CASCADE
);

CREATE TABLE menu_participant (
  menu_participant_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  menu_item_id BIGINT NOT NULL,
  participant_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_menu_participant UNIQUE (menu_item_id, participant_id),
  CONSTRAINT fk_menu_participant_menu
    FOREIGN KEY (menu_item_id)
    REFERENCES menu_item (menu_item_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_menu_participant_participant
    FOREIGN KEY (participant_id)
    REFERENCES participant (participant_id)
    ON DELETE CASCADE
);

CREATE TABLE settlement_result (
  settlement_result_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  settlement_room_id BIGINT NOT NULL,
  participant_id BIGINT NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  CONSTRAINT uq_settlement_result UNIQUE (settlement_room_id, participant_id),
  CONSTRAINT fk_settlement_result_room
    FOREIGN KEY (settlement_room_id)
    REFERENCES settlement_room (settlement_room_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_settlement_result_participant
    FOREIGN KEY (participant_id)
    REFERENCES participant (participant_id)
    ON DELETE CASCADE
);

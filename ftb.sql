DROP TABLE IF EXISTS keywords;

CREATE TABLE IF NOT EXISTS
keywords (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR(256) NOT NULL,
  count INT NOT NULL
);

INSERT INTO keywords (keyword, count) VALUES ('hello', 3);
INSERT INTO keywords (keyword, count) VALUES ('world', 11);
INSERT INTO keywords (keyword, count) VALUES ('nice', 69);
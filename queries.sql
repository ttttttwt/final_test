-- Schema for users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(200) NOT NULL
);

-- Schema for posts (updated with user_id)
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  subject VARCHAR(200) NOT NULL,
  title VARCHAR(300) NOT NULL,
  content VARCHAR(1000) NOT NULL,
  user_id INTEGER REFERENCES users(id)
);

-- Schema for comments
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER NOT NULL REFERENCES users(id),
  post_id INTEGER NOT NULL REFERENCES posts(id),
  edited BOOLEAN DEFAULT FALSE
);

-- Default user
INSERT INTO users (username, password) VALUES 
('twwt', '$2b$10$8KVv2P9zUVNHgFb3DYQYfO5xynCCyAsFkKqet.12W.HmubFCSlsAK');

-- Sample data with user_id assigned to default user
INSERT INTO posts (subject, title, content, user_id) VALUES 
('Fitness', 'How to get fit', 'Eat healthy and exercise', 1),
('Technology', 'Learning to Code', 'Start with the basics and practice daily', 1),
('Travel', 'Visit Vietnam', 'Amazing culture and delicious food', 1);

-- Add some sample comments
INSERT INTO comments (content, user_id, post_id) VALUES 
('This is a great post about fitness!', 1, 1),
('I learned a lot from this coding article.', 1, 2),
('Vietnam is on my bucket list!', 1, 3);



//Work plan- npm init -y, npm i express, write server including "/", "/contact", "about" endopints, nodemon app.js.
import express from "express";
import bodyParser from "body-parser"; // Middleware
import ejs from "ejs";
import _ from "lodash";
import nodemailer from "nodemailer";
import path from "path";
import Swal from 'sweetalert2/dist/sweetalert2.all.min.js';
import serverless from 'serverless-http';
import pg from "pg";
import dotenv from 'dotenv';
import multer from "multer";
import bcrypt from 'bcrypt';
import session from 'express-session';

const homeStartingContent = "Hi Everyone.";
const aboutTitle = "About Me"; 
const contactTitle = "Contact";
const notification = "";

/*
Creating the application structure, including routes, views, and static files.
Setting up the Express.js server and defining the necessary routes.
*/

// Express.js server:
const app = express();
const port = process.env.PORT || 3000; // Use the PORT provided by the environment or default to 3000

dotenv.config();

app.set('view engine', 'ejs');

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Add this function before db connection
async function initializeDatabase() {
  try {
    // Create users table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(200) NOT NULL
      )
    `);
    
    // Create posts table with user_id foreign key
    await db.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        subject VARCHAR(200) NOT NULL,
        title VARCHAR(300) NOT NULL,
        content VARCHAR(1000) NOT NULL,
        user_id INTEGER REFERENCES users(id)
      )
    `);
    
    // Create comments table with user_id and post_id foreign keys
    await db.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER NOT NULL REFERENCES users(id),
        post_id INTEGER NOT NULL REFERENCES posts(id),
        edited BOOLEAN DEFAULT FALSE
      )
    `);

    // Check if default user exists
    const userResult = await db.query("SELECT COUNT(*) FROM users WHERE username = 'twwt'");
    if (userResult.rows[0].count === '0') {
      // Create default user with hashed password
      const hashedPassword = await bcrypt.hash('1234', 10);
      await db.query(`
        INSERT INTO users (username, password) VALUES ('twwt', $1)
      `, [hashedPassword]);
      console.log('Default user created successfully');
    }

    // Check if posts table is empty
    const postResult = await db.query("SELECT COUNT(*) FROM posts");
    if (postResult.rows[0].count === '0') {
      // Get the default user ID
      const defaultUser = await db.query("SELECT id FROM users WHERE username = 'twwt'");
      const defaultUserId = defaultUser.rows[0].id;
      
      // Insert sample data
      await db.query(`
        INSERT INTO posts (subject, title, content, user_id) VALUES
        ('Fitness', 'How to get fit', 'Eat healthy and exercise', $1),
        ('Technology', 'Learning to Code', 'Start with the basics and practice daily', $1),
        ('Travel', 'Visit Vietnam', 'Amazing culture and delicious food', $1)
      `, [defaultUserId]);
      console.log('Sample data inserted successfully');
    } else {
      // Update existing posts with no user_id
      const defaultUser = await db.query("SELECT id FROM users WHERE username = 'twwt'");
      if (defaultUser.rows.length > 0) {
        const defaultUserId = defaultUser.rows[0].id;
        await db.query("UPDATE posts SET user_id = $1 WHERE user_id IS NULL", [defaultUserId]);
        console.log('Existing posts updated with default user');
      }
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL
});
db.connect()
  .then(() => {
    console.log('Database connected successfully');
    return initializeDatabase();
  })
  .catch(err => console.error('Database connection error:', err));

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
// Server static files
app.use(express.static("public"));

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

// Pass user data to all routes
app.use((req, res, next) => {
  res.locals.user = req.session.userId ? { id: req.session.userId, username: req.session.username } : null;
  next();
});

// Authentication routes
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.render('login', { error: 'Invalid username or password' });
    }
    
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    
    if (!match) {
      return res.render('login', { error: 'Invalid username or password' });
    }
    
    req.session.userId = user.id;
    req.session.username = user.username;
    res.redirect('/');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'An error occurred during login' });
  }
});

app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if username already exists
    const userExists = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.render('register', { error: 'Username already exists' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const result = await db.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );
    
    const user = result.rows[0];
    req.session.userId = user.id;
    req.session.username = user.username;
    res.redirect('/');
  } catch (err) {
    console.error('Registration error:', err);
    res.render('register', { error: 'An error occurred during registration' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Original routes with authentication checks
app.get("/", async function(req, res){
  try {
    const result = await db.query("SELECT posts.*, users.username FROM posts LEFT JOIN users ON posts.user_id = users.id ORDER BY posts.id ASC");
    const posts = result.rows;

    res.render("home", {
      startingContent: homeStartingContent, 
      posts: posts,
    });
  } catch (err) {
    console.log(err);
  }
});

// GET ABOUT:
app.get("/about", function(req, res){
  res.render("about", {aboutTitle: aboutTitle});  // render the about page and pass the aboutContent variable to it
});

// GET contact:
app.get("/contact", function(req, res){
  res.render("contact", {contactTitle: contactTitle, notification: notification});  // render the contact page and pass the contactContent variable to it 
});

// Multer configuration for handling file uploads
const upload = multer({ dest: 'uploads/' }); // Set the destination folder where uploaded files will be stored

// GET and POST compose (put together):
app.get("/compose", isAuthenticated, async function(req, res){
  res.render("compose");
});
app.post("/compose", isAuthenticated, async function(req, res){
  try {
    const result = await db.query(
      "INSERT INTO posts (subject, title, content, user_id) VALUES ($1, $2, $3, $4) RETURNING *", 
      [req.body.postSubject, req.body.postTitle, req.body.postBody, req.session.userId]
    );
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

// When a user clicks on a post, the app should display the post's subject, title, and content on a new page (post.ejs).
// Using ID as the route parameter for better reliability
app.get("/posts/:postId", async function(req, res){
  try {
    const postId = req.params.postId;
    const result = await db.query(`
      SELECT posts.*, users.username 
      FROM posts 
      LEFT JOIN users ON posts.user_id = users.id 
      WHERE posts.id = $1
    `, [postId]);
    
    const post = result.rows[0];
    
    if (post) {
      const isOwner = req.session.userId && post.user_id === req.session.userId;
      
      // Fetch comments for this post
      const commentsResult = await db.query(`
        SELECT comments.*, users.username 
        FROM comments 
        LEFT JOIN users ON comments.user_id = users.id 
        WHERE comments.post_id = $1
        ORDER BY comments.created_at ASC
      `, [postId]);
      
      res.render("post", {
        id: post.id,
        subject: post.subject, 
        title: post.title, 
        content: post.content,
        username: post.username,
        isOwner: isOwner,
        comments: commentsResult.rows
      });
    } else {
      res.status(404).send("Post not found");
    }
  } catch (err) {
    console.error("Error fetching post:", err);
    res.status(500).send("Error fetching post");
  }
});

// GET route to render the edit form for a specific post - now using ID
app.get("/edit/:postId", isAuthenticated, async function (req, res) {
  try {
    const postId = req.params.postId;
    const result = await db.query("SELECT * FROM posts WHERE id = $1", [postId]);
    const post = result.rows[0];

    if (!post) {
      return res.status(404).send("Post not found");
    }
    
    // Check if the logged-in user is the owner of the post
    if (post.user_id !== req.session.userId) {
      return res.status(403).send("You don't have permission to edit this post");
    }
    
    res.render("edit", { post: post });
  } catch (err) {
    console.error("Error fetching post for edit:", err);
    res.status(500).send("Error fetching post for edit");
  }
});

// POST route to handle updating a post in the database - now using ID
app.post("/edit/:postId", isAuthenticated, async function (req, res) {
  try {
    const postId = req.params.postId;
    
    // Check post ownership before updating
    const ownerCheck = await db.query("SELECT user_id FROM posts WHERE id = $1", [postId]);
    if (ownerCheck.rows.length === 0) {
      return res.status(404).send("Post not found");
    }
    
    if (ownerCheck.rows[0].user_id !== req.session.userId) {
      return res.status(403).send("You don't have permission to edit this post");
    }
    
    const result = await db.query(
      "UPDATE posts SET subject = $1, title = $2, content = $3 WHERE id = $4 RETURNING *",
      [req.body.postSubject, req.body.postTitle, req.body.postBody, postId]
    );

    res.redirect("/posts/" + postId);
  } catch (err) {
    console.error("Error updating post:", err);
    res.status(500).send("Error updating post");
  }
});

// Delete post route - now using ID
app.get("/delete/:postId", isAuthenticated, async function (req, res) {
  const postId = req.params.postId;
  try {
    // Check post ownership before deleting
    const ownerCheck = await db.query("SELECT user_id FROM posts WHERE id = $1", [postId]);
    if (ownerCheck.rows.length === 0) {
      return res.status(404).send("Post not found");
    }
    
    if (ownerCheck.rows[0].user_id !== req.session.userId) {
      return res.status(403).send("You don't have permission to delete this post");
    }
    
    await db.query("DELETE FROM posts WHERE id = $1", [postId]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error deleting post");
  }
});

// Search route
app.get("/search", async function(req, res) {
  try {
    const query = req.query.query;
    if (!query) {
      return res.redirect("/");
    }

    // First, ensure the pg_trgm extension is enabled
    await db.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");

    // Search using trigram similarity for fuzzy matching with similarity threshold
    const result = await db.query(`
      SELECT 
        posts.*,
        users.username,
        similarity(title, $1) as title_sim,
        similarity(content, $1) as content_sim
      FROM posts 
      LEFT JOIN users ON posts.user_id = users.id
      WHERE 
        similarity(title, $1) > 0.3 OR
        similarity(content, $1) > 0.3 OR
        title ILIKE $2 OR 
        content ILIKE $2
      ORDER BY GREATEST(similarity(title, $1), similarity(content, $1)) DESC
    `, [query, `%${query}%`]);
    
    res.render("search-results", {
      query: query,
      results: result.rows,
      resultsCount: result.rows.length
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).send("Error performing search");
  }
});

// POST request for handling the form submission
app.post("/contact", function (req, res) {
  // Extract form data
  const name = req.body.name;
  const email = req.body.email;
  const inquiry = req.body.inquiry;
  const message = req.body.message;

  // Nodemailer configuration
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "quocla.21it@vku.udn.vn", // 
      pass: process.env.APP_PASSWORD, // "App Password"- generated app password (provided by gmail)
    },
  });

  // Function to format camel case words with spaces
function formatInquiry(inquiry) {
  return inquiry.replace(/([a-z])([A-Z])/g, '$1 $2');
}

  // Email options
  const mailOptions = {
    from: email,
    to: "quocla.21it@vku.udn.vn",
    subject: `New Message from ${name}`,
    text: `Inquiry: ${formatInquiry(inquiry)} \n\n\n ${message} \n\n Email sent from: ${email}`,
  };

  // Send the email
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error(error);
      res.redirect("/contact?notification=Error: Unable to send the message.");      
    } else {
      console.log("Email sent: " + info.response);
      // Use redirect with notification in query parameter
      res.redirect("/contact?notification=Email sent successfully!");
    }
  });
});

// Add user data to all routes
app.use((req, res, next) => {
  res.locals.user = null;
  next();
});

// Comment routes
// Add a new comment
app.post("/posts/:postId/comments", isAuthenticated, async function(req, res) {
  try {
    const postId = req.params.postId;
    const userId = req.session.userId;
    const content = req.body.commentContent;
    
    if (!content || content.trim() === '') {
      return res.redirect(`/posts/${postId}`);
    }
    
    await db.query(
      "INSERT INTO comments (content, user_id, post_id) VALUES ($1, $2, $3)",
      [content, userId, postId]
    );
    
    res.redirect(`/posts/${postId}`);
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).send("Error adding comment");
  }
});

// Edit comment page
app.get("/comments/:commentId/edit", isAuthenticated, async function(req, res) {
  try {
    const commentId = req.params.commentId;
    const userId = req.session.userId;
    
    const commentResult = await db.query(
      "SELECT comments.*, posts.id AS post_id FROM comments JOIN posts ON comments.post_id = posts.id WHERE comments.id = $1",
      [commentId]
    );
    
    if (commentResult.rows.length === 0) {
      return res.status(404).send("Comment not found");
    }
    
    const comment = commentResult.rows[0];
    
    // Check if the logged-in user is the owner of the comment
    if (comment.user_id !== userId) {
      return res.status(403).send("You don't have permission to edit this comment");
    }
    
    res.render("edit-comment", { comment: comment });
  } catch (err) {
    console.error("Error fetching comment:", err);
    res.status(500).send("Error fetching comment");
  }
});

// Update comment
app.post("/comments/:commentId", isAuthenticated, async function(req, res) {
  try {
    const commentId = req.params.commentId;
    const userId = req.session.userId;
    const content = req.body.commentContent;
    
    // Check comment ownership
    const ownerCheck = await db.query(
      "SELECT user_id, post_id FROM comments WHERE id = $1",
      [commentId]
    );
    
    if (ownerCheck.rows.length === 0) {
      return res.status(404).send("Comment not found");
    }
    
    if (ownerCheck.rows[0].user_id !== userId) {
      return res.status(403).send("You don't have permission to edit this comment");
    }
    
    const postId = ownerCheck.rows[0].post_id;
    
    await db.query(
      "UPDATE comments SET content = $1, edited = TRUE WHERE id = $2",
      [content, commentId]
    );
    
    res.redirect(`/posts/${postId}`);
  } catch (err) {
    console.error("Error updating comment:", err);
    res.status(500).send("Error updating comment");
  }
});

// Delete comment
app.post("/comments/:commentId/delete", isAuthenticated, async function(req, res) {
  try {
    const commentId = req.params.commentId;
    const userId = req.session.userId;
    
    // Check comment ownership
    const ownerCheck = await db.query(
      "SELECT user_id, post_id FROM comments WHERE id = $1",
      [commentId]
    );
    
    if (ownerCheck.rows.length === 0) {
      return res.status(404).send("Comment not found");
    }
    
    if (ownerCheck.rows[0].user_id !== userId) {
      return res.status(403).send("You don't have permission to delete this comment");
    }
    
    const postId = ownerCheck.rows[0].post_id;
    
    await db.query("DELETE FROM comments WHERE id = $1", [commentId]);
    
    res.redirect(`/posts/${postId}`);
  } catch (err) {
    console.error("Error deleting comment:", err);
    res.status(500).send("Error deleting comment");
  }
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

// Export the app object. This is required for the serverless function.
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Hello from Express.js!' });
}
);
app.use('/.netlify/functions/app', router);  // path must route to lambda

export const handler = serverless(app);


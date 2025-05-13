# Express.js Blog Application

A full-featured blog application built with Express.js, PostgreSQL, and EJS templating engine.

## Features

- **User Authentication**: Register, login, and logout functionality
- **Blog Posts Management**: Create, read, update, and delete blog posts
- **Comments System**: Add, edit, and delete comments on posts
- **Search Functionality**: Search posts by title and content with fuzzy matching
- **Contact Form**: Send messages through a contact form using Nodemailer
- **Responsive Design**: Works on various screen sizes

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **View Engine**: EJS
- **Authentication**: bcrypt for password hashing, express-session for session management
- **Email**: Nodemailer for sending emails
- **Others**: Multer for file uploads, dotenv for environment variables

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd final_test
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```
   DATABASE_URL=your_postgresql_connection_string
   SESSION_SECRET=your_session_secret
   APP_PASSWORD=your_email_app_password
   PORT=3000
   ```

4. Start the server:
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   nodemon app.js
   ```

## Database Setup

The application automatically sets up the database tables on first run:

- Users table
- Posts table
- Comments table

A default user (username: 'twwt', password: '1234') is created for testing purposes.

## API Endpoints

### Authentication

- `GET /login` - Login page
- `POST /login` - Process login
- `GET /register` - Registration page
- `POST /register` - Process registration
- `GET /logout` - Logout

### Blog Posts

- `GET /` - View all posts
- `GET /posts/:postId` - View a specific post
- `GET /compose` - Form to create a new post (requires authentication)
- `POST /compose` - Create a new post (requires authentication)
- `GET /edit/:postId` - Edit form for a post (requires ownership)
- `POST /edit/:postId` - Update a post (requires ownership)
- `GET /delete/:postId` - Delete a post (requires ownership)

### Comments

- `POST /posts/:postId/comments` - Add a comment to a post
- `GET /comments/:commentId/edit` - Edit form for a comment
- `POST /comments/:commentId` - Update a comment
- `POST /comments/:commentId/delete` - Delete a comment

### Others

- `GET /about` - About page
- `GET /contact` - Contact form
- `POST /contact` - Send email from contact form
- `GET /search` - Search posts

## Usage

1. Register a new user or login with the default user (twwt/1234)
2. Create new blog posts from the compose page
3. View, edit and delete your posts
4. Comment on posts and manage your comments
5. Search for posts using the search functionality
6. Contact the administrator through the contact form

## License

[MIT](LICENSE)

# Smart Attendance Management System

A Node.js + Express.js backend for managing attendance with PostgreSQL database.

## Project Structure

```
attendance/
├── server/
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── config/          # Configuration files
│   │   └── db.js        # Database connection
│   ├── app.js           # Express app setup
│   ├── server.js        # Server entry point
│   └── .env             # Environment variables
├── package.json
└── README.md
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   - Update `server/.env` with your PostgreSQL credentials
   - Change `DB_PASSWORD` and `JWT_SECRET` to your actual values

3. **Database Setup**
   - Make sure PostgreSQL is installed and running
   - Create a database named `attendance_db`

4. **Run the Application**
   ```bash
   # Development mode with nodemon
   npm run dev
   
   # Production mode
   npm start
   ```

## Available Scripts

- `npm start` - Run the server in production mode
- `npm run dev` - Run the server in development mode with nodemon
- `npm run server` - Alternative command for development mode

## API Endpoints

- `GET /` - Health check endpoint
- `GET /api/users` - Dummy users endpoint (for testing)

## Dependencies

- **express** - Web framework
- **pg** - PostgreSQL client
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable loader
- **jsonwebtoken** - JWT token handling
- **bcrypt** - Password hashing
- **nodemon** - Development server (dev dependency)

## Next Steps

1. Create database models in `server/models/`
2. Implement authentication middleware in `server/middleware/`
3. Create API routes in `server/routes/`
4. Implement controllers in `server/controllers/`

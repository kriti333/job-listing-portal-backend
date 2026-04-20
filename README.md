# Job Listing Portal - Backend API

Production-grade RESTful API for Job Listing Portal built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication (Access + Refresh tokens)
  - Google OAuth 2.0 integration
  - Role-based access control (Job Seeker, Employer, Admin)
  - Secure password hashing with bcrypt

- **Job Management**
  - CRUD operations for job postings
  - Advanced filtering and search
  - Pagination support
  - Job status management

- **Application Tracking**
  - Apply for jobs
  - Track application status
  - ATS score calculation
  - Interview scheduling

- **User Profiles**
  - Profile management
  - Resume upload
  - Company profile (for employers)
  - Profile completion tracking

- **Messaging System**
  - Real-time-like messaging between users
  - Conversation threads
  - Unread message tracking

- **Dashboard Analytics**
  - Job seeker dashboard with application stats
  - Employer dashboard with applicant metrics

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js   # MongoDB connection
│   │   └── passport.js   # Google OAuth config
│   ├── controllers/      # Request handlers
│   │   ├── authController.js
│   │   ├── jobController.js
│   │   ├── applicationController.js
│   │   ├── userController.js
│   │   ├── messageController.js
│   │   └── dashboardController.js
│   ├── models/           # Mongoose schemas
│   │   ├── User.js
│   │   ├── Job.js
│   │   ├── Application.js
│   │   └── Message.js
│   ├── routes/           # API routes
│   │   ├── auth.js
│   │   ├── jobs.js
│   │   ├── applications.js
│   │   ├── users.js
│   │   ├── messages.js
│   │   └── dashboard.js
│   ├── middleware/       # Custom middleware
│   │   ├── auth.js       # Authentication middleware
│   │   ├── validate.js   # Validation middleware
│   │   └── errorHandler.js
│   ├── utils/            # Utility functions
│   │   ├── jwtUtils.js
│   │   ├── responseHelper.js
│   │   └── fileUpload.js
│   └── server.js         # Entry point
├── uploads/              # File uploads directory
├── .env                  # Environment variables
├── .gitignore
└── package.json
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB
- Google OAuth credentials (optional)

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables
The `.env` file is already configured with your MongoDB URI. Update the following if needed:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB (Already configured)
MONGO_URI=mongodb+srv://ku2407u661_db_user:QRIqFxXnFMNgsVj3@cluster0.xmyi9hz.mongodb.net/job-portal?retryWrites=true&w=majority

# JWT Secrets (Change these in production!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_2024
JWT_REFRESH_SECRET=your_super_secret_refresh_token_key_change_this_2024

# Google OAuth (Optional - for "Continue with Google")
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### Step 3: Run the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server will start on `http://localhost:5000`

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login user
POST   /api/auth/refresh           - Refresh access token
POST   /api/auth/logout            - Logout user
GET    /api/auth/me                - Get current user
GET    /api/auth/google            - Initiate Google OAuth
GET    /api/auth/google/callback   - Google OAuth callback
```

### Jobs
```
GET    /api/jobs                   - Get all jobs (with filters)
GET    /api/jobs/:id               - Get job by ID
POST   /api/jobs                   - Create job (Employer only)
PUT    /api/jobs/:id               - Update job (Employer only)
DELETE /api/jobs/:id               - Delete job (Employer only)
PATCH  /api/jobs/:id/status        - Update job status
GET    /api/jobs/employer/my-jobs  - Get employer's jobs
GET    /api/jobs/:id/applicants    - Get job applicants
```

### Applications
```
POST   /api/applications                    - Apply for job (Job Seeker)
GET    /api/applications/my-applications    - Get my applications
GET    /api/applications/stats              - Get application stats
GET    /api/applications/:id                - Get application by ID
PATCH  /api/applications/:id/status         - Update status (Employer)
PATCH  /api/applications/:id/withdraw       - Withdraw application
POST   /api/applications/:id/schedule-interview - Schedule interview
```

### Users
```
GET    /api/users/profile              - Get profile
PUT    /api/users/profile              - Update profile
POST   /api/users/profile/picture      - Upload profile picture
POST   /api/users/profile/resume       - Upload resume (Job Seeker)
POST   /api/users/profile/company-logo - Upload company logo (Employer)
PUT    /api/users/change-password      - Change password
DELETE /api/users/account              - Deactivate account
```

### Messages
```
POST   /api/messages                    - Send message
GET    /api/messages/conversations      - Get all conversations
GET    /api/messages/conversation/:id   - Get conversation with user
GET    /api/messages/unread-count       - Get unread count
PATCH  /api/messages/:id/read           - Mark as read
```

### Dashboard
```
GET    /api/dashboard/job-seeker    - Job seeker dashboard data
GET    /api/dashboard/employer      - Employer dashboard data
```

## 🔒 Authentication

### Protected Routes
Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

### Token Refresh
When the access token expires, use the refresh token endpoint:

```javascript
POST /api/auth/refresh
{
  "refreshToken": "your_refresh_token"
}
```

## 🔑 Google OAuth Setup (Optional)

To enable "Continue with Google":

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

## 📊 Database Schema

### User Model
- Basic info: name, email, password
- Role: job_seeker | employer | admin
- Job Seeker fields: skills, experience, education, resume
- Employer fields: company details
- Profile completion tracking

### Job Model
- Job details: title, description, skills
- Compensation: salary range
- Location & work type
- Employer reference
- Application tracking

### Application Model
- Job and user references
- Status tracking with timeline
- Interview scheduling
- ATS score calculation
- Documents storage

### Message Model
- Sender/receiver references
- Job/application context
- Read status tracking

## 🛡️ Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Separate access and refresh tokens
- **Input Validation**: express-validator
- **CORS Protection**: Configured origins
- **File Upload Security**: Type and size validation
- **Error Handling**: Centralized error middleware
- **MongoDB Injection Prevention**: Mongoose sanitization

## 🧪 Testing the API

### Using Demo Credentials

**Job Seeker:**
```
Email: seeker@example.com
Password: password123
```

**Employer:**
```
Email: employer@example.com  
Password: password123
```

### Using Postman/Thunder Client

1. Register or login to get access token
2. Copy the `accessToken` from response
3. Add to Authorization header: `Bearer <token>`
4. Make requests to protected endpoints

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved",
  "data": [ ... ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🚨 Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error

## 🔧 Environment Variables Explained

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGO_URI` | MongoDB connection string | - |
| `JWT_SECRET` | Secret for access tokens | - |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | - |
| `JWT_EXPIRE` | Access token expiry | 7d |
| `JWT_REFRESH_EXPIRE` | Refresh token expiry | 30d |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | - |
| `FRONTEND_URL` | Frontend application URL | http://localhost:5173 |

## 📚 Dependencies

### Core
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication

### Authentication
- `passport` - Authentication middleware
- `passport-google-oauth20` - Google OAuth strategy
- `express-session` - Session management

### Validation & Security
- `express-validator` - Input validation
- `cors` - CORS handling
- `dotenv` - Environment variables

### File Upload
- `multer` - File upload middleware

### Development
- `nodemon` - Auto-reload during development

## 🚀 Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Enable HTTPS
4. Configure production MongoDB URI
5. Set up proper CORS origins

### Recommended Platforms
- **Heroku**: Easy deployment with free tier
- **Railway**: Modern platform with MongoDB support
- **Render**: Simple deployment with free tier
- **AWS/Azure**: Enterprise-level hosting

## 📞 Support

For issues or questions:
- Check the API documentation
- Review error messages carefully
- Ensure all environment variables are set
- Verify MongoDB connection

## 📄 License

MIT License - Feel free to use for your projects!

---

**Built with ❤️ using Node.js, Express, and MongoDB**

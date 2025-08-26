# CivicResolve - Civic Issue Reporting Platform

A modern web application for reporting and managing civic issues in communities, built with Next.js, TypeScript, and MySQL.

## Features

- 🏛️ **Issue Reporting**: Citizens can report civic issues with photos and location data
- 🗺️ **Interactive Map**: View issues on an interactive map with clustering
- 👥 **User Management**: User registration, authentication, and profiles
- 🔐 **Admin Dashboard**: Administrative panel for managing issues and users
- 📊 **Analytics**: Real-time statistics and issue tracking
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MySQL
- **Authentication**: JWT with httpOnly cookies
- **Maps**: Leaflet.js with OpenStreetMap
- **UI Components**: Radix UI
- **Animations**: Framer Motion

## Prerequisites

- Node.js 18.17 or later
- MySQL 8.0 or later
- npm/pnpm/yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd civicresolve
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   - Database connection details
   - Generate a secure JWT secret: `openssl rand -base64 32`
   - Set your domain URL

4. **Set up the database**
   ```bash
   # Create database and tables
   mysql -u root -p < scripts/init-database.sql
   
   # (Optional) Seed with sample data
   mysql -u root -p < scripts/seed-data.sql
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

6. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000) in your browser
   - Admin panel: [http://localhost:3000/admin](http://localhost:3000/admin)

## Production Deployment

1. **Build the application**
   ```bash
   pnpm build
   pnpm start
   ```

2. **Environment Setup**
   - Set `NODE_ENV=production`
   - Use a production MySQL database
   - Generate a secure JWT secret
   - Set proper CORS origins
   - Enable HTTPS

3. **Database Migration**
   - Run the database initialization scripts on your production database
   - Ensure proper indexes are created for performance

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `GET /api/auth/me` - Get current user

### Issues
- `GET /api/issues` - List all issues
- `POST /api/issues` - Create new issue
- `GET /api/issues/[id]` - Get specific issue
- `POST /api/issues/[id]/comments` - Add comment
- `POST /api/issues/[id]/vote` - Vote on issue

### Analytics
- `GET /api/analytics` - Get system analytics

## Database Schema

The application uses the following main tables:
- `users` - User accounts and profiles
- `issues` - Reported civic issues
- `comments` - Comments on issues  
- `votes` - User votes on issues

See `scripts/init-database.sql` for the complete schema.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Security

- JWT tokens are stored in httpOnly cookies
- Passwords are hashed with bcrypt
- Admin routes are protected by middleware
- Input validation with Zod schemas
- SQL injection prevention with prepared statements

## License

This project is licensed under the MIT License.

## Support

For support, please create an issue in the GitHub repository or contact the development team.

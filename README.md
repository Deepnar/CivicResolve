# CivicResolve

A comprehensive civic issue management platform that empowers citizens to report, track, and resolve community problems while providing administrators with powerful tools to manage municipal services efficiently.

## Project Overview

CivicResolve is a Next.js 15 full-stack application built with TypeScript that bridges the gap between citizens and local government. The platform enables citizens to report civic issues like potholes, broken streetlights, and infrastructure problems, while providing administrators with comprehensive dashboards to manage and resolve these issues effectively.

## Key Features

### Authentication & User Management
- JWT-based secure authentication system
- Role-based access control (CITIZEN/ADMIN)
- User registration and profile management
- Password encryption with bcryptjs

### Issue Reporting & Management
- **Issue Creation**: Citizens can report issues with descriptions, photos, and precise location data
- **Issue Tracking**: Complete lifecycle management (PENDING → IN_PROGRESS → RESOLVED)
- **Priority System**: Issues categorized by priority (LOW, MEDIUM, HIGH)
- **Category Classification**: Infrastructure, Road Maintenance, Utilities, Environment, Safety, Other
- **Location-Based Filtering**: Interactive map integration with Leaflet
- **Status Updates**: Real-time issue status tracking and notifications

### Interactive Map System
- **Location Picker**: Precise issue location selection using Leaflet maps
- **Issue Visualization**: Visual representation of all reported issues on interactive maps
- **Geographic Analytics**: Location-based issue statistics and trends
- **Address Autocomplete**: Smart location search and validation

### Community Engagement
- **Voting System**: Citizens can upvote/downvote issues to indicate priority
- **Comment System**: Threaded discussions on individual issues
- **User Engagement Metrics**: Track community participation and activity levels
- **Public Issue Visibility**: Transparent access to community issues

### Administrative Dashboard
- **Comprehensive Analytics**: Real-time statistics dashboard for administrators
- **User Management**: Admin controls for user accounts and permissions
- **Issue Resolution Workflow**: Streamlined tools for updating issue status and responses
- **Performance Metrics**: Resolution times, category analysis, and workload distribution
- **Data Export**: Analytics and reporting capabilities

### AI-Powered Chat Assistant
- **Google Gemini 2.0 Flash Integration**: Advanced natural language processing
- **Real-Time Data Integration**: AI assistant with live database connectivity
- **Context-Aware Responses**: Intelligent assistance based on current page and user role
- **Platform Statistics**: Instant access to comprehensive civic data through conversational interface
- **Role-Based Information**: Tailored responses for citizens vs administrators
- **Markdown Rendering**: Rich text formatting in AI responses

## Technology Stack

### Frontend
- **Next.js 15**: React framework with App Router architecture
- **TypeScript**: Type-safe development environment
- **Tailwind CSS**: Utility-first styling framework
- **Radix UI**: Accessible, unstyled UI components
- **Framer Motion**: Animation and motion graphics
- **React Hook Form**: Form state management and validation
- **Zod**: Schema validation and type inference
- **React Leaflet**: Interactive map components
- **React Markdown**: Markdown rendering for AI responses

### Backend
- **Next.js API Routes**: Server-side API endpoints
- **MySQL 2**: Database connectivity and query execution
- **JWT**: JSON Web Token authentication
- **bcryptjs**: Password hashing and security

### AI Integration
- **Google Generative AI (@google/generative-ai)**: Gemini 2.0 Flash model integration
- **Real-time Database Queries**: Live statistics and analytics
- **Context-aware Processing**: Intelligent responses based on user context and role

### Development Tools
- **ESLint**: Code linting and quality enforcement
- **PostCSS**: CSS processing and optimization
- **Geist Font**: Modern typography system

## Getting Started

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd civicresolve
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Configuration**
   Create a `.env.local` file:
   ```env
   DATABASE_URL="mysql://username:password@localhost:3306/civicresolve"
   JWT_SECRET="your-jwt-secret-key"
   GEMINI_API_KEY="your-google-gemini-api-key"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Database Setup**
   ```bash
   # Initialize database structure
   mysql -u username -p civicresolve < database-schema.sql
   
   # Optional: Add sample data
   mysql -u username -p civicresolve < scripts/seed-data.sql
   ```

5. **Development Server**
   ```bash
   pnpm dev
   ```

6. **Access the application**
   - Frontend: `http://localhost:3000`
   - Create admin account: `http://localhost:3000/register` (first user becomes admin)

## Project Structure

```
civicresolve/
├── app/                          # Next.js App Router directory
│   ├── api/                      # API route handlers
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── analytics/            # Admin analytics API
│   │   ├── chat/                 # AI assistant endpoint
│   │   ├── issues/               # Issue management API
│   │   └── users/                # User management API
│   ├── admin/                    # Admin dashboard pages
│   ├── issues/                   # Issue detail pages
│   ├── map/                      # Interactive map interface
│   └── login/                    # Authentication pages
├── components/                   # Reusable UI components
│   ├── auth/                     # Authentication components
│   ├── maps/                     # Map-related components
│   ├── navigation/               # Navigation components
│   └── ui/                       # Base UI component library
├── lib/                          # Utility libraries and configurations
├── hooks/                        # Custom React hooks
├── public/                       # Static assets
└── styles/                       # Global stylesheets
```

## AI Chat Assistant

### Google Gemini Integration

The platform integrates Google's Gemini 2.0 Flash model to provide intelligent, context-aware assistance to both citizens and administrators. The AI assistant operates through a dedicated API endpoint (`/api/chat`) that combines natural language processing with real-time database queries.

#### Core Implementation
```typescript
// AI service initialization
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
```

### Real-Time Data Integration

The AI assistant executes complex database queries to provide instant insights:

#### Platform Statistics
- **Issue Analytics**: Real-time counts by status, category, and priority
- **User Engagement**: Community participation metrics and voting patterns  
- **Location Intelligence**: Geographic distribution and area-specific statistics
- **Trend Analysis**: Historical data patterns and resolution timelines
- **Performance Metrics**: Average resolution times and departmental efficiency

#### Database Query Engine
The assistant performs comprehensive SQL aggregations including:
```sql
-- Community engagement analysis
SELECT 
  u.name,
  COUNT(DISTINCT i.id) as issues_reported,
  COUNT(DISTINCT v.issue_id) as votes_cast,
  COUNT(DISTINCT c.id) as comments_made
FROM users u
LEFT JOIN issues i ON u.id = i.reporter_id
LEFT JOIN votes v ON u.id = v.user_id  
LEFT JOIN comments c ON u.id = c.author_id
GROUP BY u.id, u.name;
```

### Context-Aware Intelligence

The AI system provides tailored responses based on:
- **User Role**: Different capabilities for citizens vs administrators
- **Current Page**: Context-specific assistance (issue reporting, map navigation, admin dashboard)
- **User History**: Personalized responses based on past interactions
- **Platform State**: Real-time system status and performance metrics

### Citizen Experience Enhancement

#### Intelligent Assistance
- **Issue Reporting Guidance**: Step-by-step help for reporting civic problems
- **Status Updates**: Real-time information about submitted issues
- **Community Insights**: Local area statistics and trending issues  
- **Platform Navigation**: Interactive help for using platform features

#### Natural Language Processing
- **Query Understanding**: Interprets citizen questions about civic processes
- **Information Retrieval**: Instant access to platform data through conversation
- **Workflow Guidance**: Explains civic engagement processes and procedures
- **Community Connection**: Facilitates understanding of local issue patterns

### Administrative Intelligence

#### Data-Driven Insights
- **Performance Analytics**: Real-time KPIs for departmental efficiency
- **Resource Optimization**: Analysis of issue distribution and resolution patterns
- **Community Engagement**: Detailed user participation and voting statistics
- **Trend Identification**: Pattern recognition in issue reporting and resolution

#### Operational Support
- **Issue Prioritization**: AI-assisted priority assessment based on community impact
- **Workflow Optimization**: Intelligent suggestions for process improvements
- **Reporting Automation**: Natural language queries for administrative reports
- **Decision Support**: Data-driven recommendations for resource allocation

### Technical Architecture

#### Security Implementation
- **Role-Based Access**: Filtered data exposure based on user permissions
- **Authentication Integration**: JWT-based security for AI interactions  
- **Data Privacy**: No persistent storage of conversation history
- **API Rate Limiting**: Prevents system abuse and ensures fair usage

#### Performance Optimization
- **Database Connection Pooling**: Efficient MySQL connection management
- **Query Optimization**: Indexed database operations for sub-second responses
- **Asynchronous Processing**: Non-blocking AI inference with streaming responses
- **Error Handling**: Graceful degradation and fallback mechanisms

#### User Interface
- **Markdown Rendering**: Rich text formatting using react-markdown
- **Context Indicators**: Visual badges showing current page context
- **Minimizable Interface**: Non-intrusive chat overlay design
- **Real-time Interaction**: Instant response delivery with loading indicators

## Technical Implementation Details

### Database Schema
- **Users Table**: Authentication, roles, and profile information
- **Issues Table**: Complete issue lifecycle management with status tracking
- **Comments Table**: Threaded discussion system with user attribution
- **Votes Table**: Community engagement and priority indication system

### API Endpoints
- `POST /api/chat` - AI assistant natural language processing
- `GET /api/analytics` - Administrative dashboard statistics
- `GET /api/issues` - Issue listing with filtering and pagination
- `POST /api/issues` - New issue creation with validation
- `GET /api/users` - User management for administrative functions

### Authentication Flow
1. User registration with role assignment (first user becomes ADMIN)
2. JWT token generation and secure cookie storage
3. Route protection middleware for authenticated endpoints
4. Role-based access control for administrative functions

### Real-time Features
- Issue status updates with immediate UI reflection
- Community voting with instant vote count updates  
- AI assistant responses with real-time database integration
- Administrative analytics with live data refresh

## Analytics & Reporting

### Key Metrics Tracked
- **Issue Resolution Times**: Average days from report to resolution by category
- **Community Engagement**: User participation rates and voting patterns
- **Geographic Analysis**: Issue distribution and location-specific trends  
- **Category Performance**: Resolution efficiency across different issue types
- **User Activity**: Individual and aggregate community participation metrics

### Dashboard Features
- **Real-time Statistics**: Live updating counters and progress indicators
- **Visual Charts**: Trend analysis and comparative data visualization
- **Filtering Capabilities**: Multi-dimensional data exploration and analysis
- **Export Functions**: Data extraction for external reporting and analysis

## Security Features

### Authentication & Authorization
- **JWT Security**: Secure token-based session management
- **Password Encryption**: bcryptjs hashing with salt for secure storage
- **Role-Based Permissions**: Granular access control for different user types
- **Session Management**: Automatic token refresh and secure logout

### Data Protection
- **Input Validation**: Comprehensive data sanitization and validation
- **SQL Injection Prevention**: Parameterized queries and prepared statements
- **XSS Protection**: Content sanitization and secure rendering
- **API Security**: Rate limiting and authenticated endpoint access

## Contributing

### Development Workflow
1. Fork the repository and create a feature branch
2. Follow TypeScript best practices and maintain type safety
3. Write comprehensive tests for new functionality  
4. Update documentation for any API or feature changes
5. Submit pull request with detailed description of changes

### Code Standards
- **ESLint Configuration**: Automated code quality enforcement
- **TypeScript Strict Mode**: Maximum type safety and error prevention
- **Component Documentation**: Clear prop interfaces and usage examples
- **Database Migrations**: Version-controlled schema changes

## Support

For technical support or feature requests:
- Create an issue in the project repository
- Contact the development team through official channels
- Consult the documentation for common troubleshooting steps

---

**CivicResolve** - Empowering communities through intelligent civic engagement technology.
# Ease Shop Plus Backend API

A Node.js Express backend API for the Ease Shop Plus e-commerce platform, integrated with Supabase as the database.

## Features

- **RESTful API** with Express.js
- **Supabase Integration** for PostgreSQL database
- **JWT Authentication** for secure user sessions
- **Rate Limiting** to prevent abuse
- **CORS Support** for frontend integration
- **Input Validation** with Joi
- **Security Middleware** with Helmet
- **Request Logging** with Morgan
- **Error Handling** with proper HTTP status codes

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - PostgreSQL database and authentication
- **JWT** - JSON Web Tokens for authentication
- **Joi** - Data validation
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logger

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account and project

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp env.example .env
   ```

   Fill in your Supabase credentials and other configuration in the `.env` file:

   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ```

4. **Database Setup**
   - Create a new Supabase project
   - Run the SQL schema from `database/schema.sql` in your Supabase SQL editor
   - This will create all necessary tables, indexes, and RLS policies

## Running the Application

### Development Mode

```bash
npm run dev
```

This will start the server with nodemon for automatic restarts on file changes.

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:5000` (or the port specified in your `.env` file).

## API Endpoints

### Health Check

- `GET /health` - Server health status

### Products

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID

### Authentication (Coming Soon)

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### Orders (Coming Soon)

- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id` - Update order status

### Cart (Coming Soon)

- `GET /api/cart` - Get user cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:id` - Update cart item
- `DELETE /api/cart/:id` - Remove cart item

## Database Schema

The database includes the following main tables:

- `users` - User accounts and profiles
- `categories` - Product categories
- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Order line items
- `cart_items` - Shopping cart items
- `delivery_tracking` - Order delivery status
- `support_tickets` - Customer support tickets
- `support_messages` - Support ticket messages

## Security Features

- **Row Level Security (RLS)** enabled on all tables
- **JWT Authentication** for API access
- **Rate Limiting** to prevent abuse
- **CORS** properly configured
- **Input Validation** on all endpoints
- **Helmet** for security headers
- **Environment Variables** for sensitive data

## Development Guidelines

1. **Code Style**: Follow the cursor rules defined in `.cursor/rules/nodejs-supabase.mdc`
2. **API Design**: Use RESTful conventions
3. **Error Handling**: Always handle errors gracefully
4. **Validation**: Validate all inputs using Joi schemas
5. **Security**: Never expose sensitive data in responses
6. **Documentation**: Document all API endpoints

## Environment Variables

| Variable                    | Description                          | Required           |
| --------------------------- | ------------------------------------ | ------------------ |
| `SUPABASE_URL`              | Supabase project URL                 | Yes                |
| `SUPABASE_ANON_KEY`         | Supabase anonymous key               | Yes                |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key            | Yes                |
| `JWT_SECRET`                | Secret key for JWT signing           | Yes                |
| `PORT`                      | Server port                          | No (default: 5000) |
| `NODE_ENV`                  | Environment (development/production) | No                 |
| `FRONTEND_URL`              | Frontend URL for CORS                | No                 |
| `RATE_LIMIT_WINDOW_MS`      | Rate limit window in milliseconds    | No                 |
| `RATE_LIMIT_MAX_REQUESTS`   | Max requests per window              | No                 |

## Contributing

1. Follow the established code style and patterns
2. Add proper error handling and validation
3. Write tests for new features
4. Update documentation as needed
5. Ensure all security best practices are followed

## License

MIT License - see LICENSE file for details

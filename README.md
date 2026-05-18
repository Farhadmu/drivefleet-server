# DriveFleet Server

Backend API for the DriveFleet Car Rental Platform.

## Setup

1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in your values
4. Run `npm run dev` for development

## Environment Variables

```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

## API Endpoints

- `POST /jwt` - Generate JWT token
- `POST /logout` - Clear JWT token
- `GET /cars` - Get all cars (with search & filter)
- `GET /cars/:id` - Get single car
- `GET /my-cars?email=` - Get user's cars (protected)
- `POST /cars` - Add a car (protected)
- `PUT /cars/:id` - Update a car (protected)
- `DELETE /cars/:id` - Delete a car (protected)
- `GET /bookings?email=` - Get user's bookings (protected)
- `POST /bookings` - Book a car (protected)
- `DELETE /bookings/:id` - Cancel a booking (protected)
# drivefleet-server

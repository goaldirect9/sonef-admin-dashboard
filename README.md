# Admin Dashboard

A Next.js web dashboard for system administrators to manage the Sonef transport platform.

## Features

### Authentication
- ✅ Admin login page with role-based authentication
- ✅ Token-based authentication (JWT)
- ✅ Protected routes with auto-redirect
- ✅ Secure logout functionality

### Dashboard
- ✅ **Analytics Cards**:
  - Total Users (registered users count)
  - Total Agencies (with active/suspended breakdown)
  - Total Trips (with active/inactive breakdown)
  - Total Bookings (all-time bookings)
- ✅ **System Overview Chart**: Bar chart visualization of all metrics
- ✅ **Agency Status Chart**: Pie chart showing active vs suspended agencies
- ✅ Quick actions panel for navigation
- ✅ Real-time data from backend APIs

### Management Features (Future Development)
- View and manage all agencies
- Approve/suspend agencies
- View all users
- View all bookings
- View all trips
- Search and pagination support

## Tech Stack

- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **HTTP Client**: Axios
- **State Management**: React Hooks

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Backend API running (default: http://localhost:3000)

### Installation

1. Install dependencies:
```bash
cd admin-dashboard
npm install
```

2. Create environment variables:
```bash
# Create .env.local file
NEXT_PUBLIC_API_URL=http://localhost:3000
```

3. Run the development server:
```bash
npm run dev
```

The application will be available at [http://localhost:3002](http://localhost:3002)

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
admin-dashboard/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── StatCard.tsx     # Statistics display card
│   │   ├── ChartCard.tsx    # Chart container
│   │   ├── SystemOverviewChart.tsx  # Bar chart for system metrics
│   │   └── AgencyStatusChart.tsx    # Pie chart for agencies
│   ├── lib/
│   │   └── api-client.ts    # Axios HTTP client with interceptors
│   ├── pages/
│   │   ├── _app.tsx         # Next.js app wrapper
│   │   ├── _document.tsx    # HTML document structure
│   │   ├── index.tsx        # Landing page (redirects)
│   │   ├── login.tsx        # Admin login page
│   │   └── dashboard.tsx    # Main dashboard page
│   ├── services/
│   │   ├── auth.service.ts  # Authentication service
│   │   └── admin.service.ts # Admin API calls
│   └── styles/
│       └── globals.css      # Global styles and Tailwind
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── postcss.config.js
```

## API Integration

The dashboard connects to the following backend endpoints:

### Authentication
- `POST /auth/admin/login` - Admin login

### Dashboard
- `GET /admin/dashboard/stats` - Get system statistics

### Management (Future)
- `GET /admin/agencies` - Get all agencies (paginated)
- `GET /admin/users` - Get all users (paginated)
- `GET /admin/bookings` - Get all bookings (paginated)
- `GET /admin/trips` - Get all trips (paginated)
- `PATCH /admin/agencies/:id/approve` - Approve an agency
- `PATCH /admin/agencies/:id/suspend` - Suspend an agency

## Pages

### Login Page (`/login`)
- Email and password fields
- Admin role authentication
- Error handling and loading states
- Secure token storage

### Dashboard (`/dashboard`)
- 4 main metric cards:
  - Total Users (with user icon)
  - Total Agencies (with breakdown)
  - Total Trips (with active/inactive counts)
  - Total Bookings (all time)
- System overview bar chart
- Agency status pie chart
- Quick actions panel
- Refresh functionality
- Logout button

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000  # Backend API URL
```

## Authentication Flow

1. Admin enters credentials on `/login`
2. Frontend calls `POST /auth/admin/login`
3. Backend validates and returns JWT token
4. Token stored in localStorage as `admin_token`
5. All API requests include token in Authorization header
6. Unauthorized requests (401) redirect to login

## Security

- JWT token-based authentication
- Protected routes with authentication check
- Automatic token refresh on API calls
- Secure logout with token cleanup
- Admin role verification on backend

## Future Development

- [ ] Agency management pages (list, approve, suspend)
- [ ] User management pages (list, view details)
- [ ] Booking management pages (list, filter, search)
- [ ] Trip management pages (list, view details)
- [ ] Advanced analytics and reports
- [ ] Export data functionality
- [ ] Real-time notifications
- [ ] Activity logs and audit trail
- [ ] Multi-role support (super admin, admin)

## Troubleshooting

### Cannot connect to backend
- Ensure backend is running on port 3000
- Check `NEXT_PUBLIC_API_URL` environment variable
- Verify CORS is enabled on backend

### Login fails
- Ensure admin user exists in database
- Verify credentials are correct
- Check backend logs for errors

### Charts not displaying
- Ensure data is being fetched correctly
- Check browser console for errors
- Verify recharts is installed

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

Proprietary - Sonef Transport System

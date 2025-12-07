# ManaHR Authentication API - Updated Password Reset

## Simplified Forgot Password API

The forgot password functionality has been updated to eliminate email sending and token validation. Users can now directly reset their password using email, new password, and confirmation.

### Endpoints

#### 1. Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "SecurePass123!"
}
```

#### 2. Login User
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### 3. Forgot Password (Direct Reset - NEW)
```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com",
  "newPassword": "NewSecurePass456!",
  "confirmPassword": "NewSecurePass456!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

#### 4. Refresh Token
```http
POST /api/v1/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

#### 5. Get User Profile
```http
GET /api/v1/auth/me
Authorization: Bearer your_access_token_here
```

#### 6. Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer your_access_token_here
```

## Key Changes Made

1. **Simplified Password Reset Flow**: Removed email token verification
2. **Direct Password Update**: Users provide email, new password, and confirmation
3. **No Email Dependency**: Eliminated mail service requirement for password reset
4. **Immediate Password Change**: Password is updated directly in the database
5. **Input Validation**: Ensures new password and confirmation match
6. **Security**: User must exist and be active to reset password

## Error Handling

The API returns appropriate error messages for:
- User not found (404)
- Account not active (401)
- Password mismatch (400)
- Missing required fields (400)

## Rate Limiting

- Authentication endpoints: 5 attempts per 15 minutes
- Password reset: 3 attempts per hour (if rate limiter is configured)

## Testing with Postman

1. First register a new user
2. Test login to verify account works
3. Use forgot-password endpoint with email and new password
4. Login again with the new password to verify the reset worked

The server is now running on the default port with the simplified password reset functionality!
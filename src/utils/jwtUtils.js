const jwt = require('jsonwebtoken');

/**
 * Generate JWT Access Token
 * Short-lived token for API authentication
 */
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { 
      id: userId, 
      role: role 
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '7d' 
    }
  );
};

/**
 * Generate JWT Refresh Token
 * Long-lived token for getting new access tokens
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { 
      id: userId 
    },
    process.env.JWT_REFRESH_SECRET,
    { 
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' 
    }
  );
};

/**
 * Verify JWT Token
 */
const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Generate both tokens
 */
const generateTokens = (userId, role) => {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken(userId);
  
  return { accessToken, refreshToken };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateTokens,
};

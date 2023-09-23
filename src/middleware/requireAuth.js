import jwt from "jsonwebtoken";

const JWT_SECRET = "your-secret-key";

const requireAuth = (req, res, next) => {
  // Get the JWT token from the request headers
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "Please login to continue." });
  }

  // Verify the JWT token
  jwt.verify(token, JWT_SECRET, (err, decodedToken) => {
    if (err) {
      return res
        .status(401)
        .json({ error: "Invalid token. Please login to continue." });
    } else {
      // If the token is valid, you can attach the user ID to the request for later use in routes
      req.userId = decodedToken.userId;
      next(); // Allow the request to proceed
    }
  });
};

export default requireAuth;

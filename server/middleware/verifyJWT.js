import jwt from 'jsonwebtoken';

export const verifyJWT = (req, res, next) => {
    // 1. Grab the Authorization header (handling both lowercase and uppercase)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    // 2. If there is no header, or it doesn't start with "Bearer ", kick them out!
    if (!authHeader?.startsWith('Bearer ')) {
        console.log("🚫 Missing or invalid Authorization header");
        return res.sendStatus(401); // 401 Unauthorized
    }

    // 3. Extract just the token part (remove the "Bearer " string)
    const token = authHeader.split(' ')[1];

    // 4. Verify the token using your secret key
    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decoded) => {
            if (err) {
                // If token is tampered with or expired, kick them out!
                return res.sendStatus(403); // 403 Forbidden
            }

            // 5. SUCCESS! 
            // We take the data you packed into the token during login
            // and attach it to the request object so the controller can use it.
            req.user = {
                id: decoded.id,             // This is exactly what profileController needs!
                account_name: decoded.account_name, 
                role: decoded.role          // For the Admin
            };
            
            // 6. Pass the baton to the next function (your controller)
            next(); 
        }
    );
};
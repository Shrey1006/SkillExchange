import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  console.log("Auth middleware hit", req.method, req.path, Boolean(header));

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No auth token" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Auth decoded", decoded);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error("Auth verify failed", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default auth;

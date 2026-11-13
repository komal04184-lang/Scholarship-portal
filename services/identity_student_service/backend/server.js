require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/db/db");

// Vite proxy (client/vite.config.js) /api/v1/auth, /profile, /admin ko isi port par bhejta hai
const PORT = process.env.PORT || 3001;

if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET missing in .env");
    process.exit(1);
}

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Identity service running on http://localhost:${PORT}`);
    });
});

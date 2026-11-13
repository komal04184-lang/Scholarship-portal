
require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/db/db");

async function startServer() {
    try {
        await connectDB();

        const PORT = process.env.PORT || 3001;

        app.listen(PORT, () => {
            console.log(
                `Identity Service running on port ${PORT}`
            );
        });

    } catch (error) {
        console.error(
            "Identity Service failed to start:",
            error.message
        );

        process.exit(1);
    }
}

startServer();

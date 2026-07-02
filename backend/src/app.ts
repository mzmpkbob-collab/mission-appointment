import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import userRoutes from "./routes/user.routes";
import missionType from "./routes/missiontype.routes";
import missionRoutes from "./routes/mission.routes";
import departmentRoutes from "./routes/department.routes";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import { requestResponseLogger } from "./middleware/requestResponseLogger";
const app = express();

// CORS configuration - Allow frontend to access the API
app.use(cors({
    origin: [
        'http://localhost:5173', 
        'http://localhost:8081', 
        'http://localhost:3000',
        'https://mission-appointment.vercel.app',
        'https://mission-appointment-eight.vercel.app',
        'https://mission-appointment-dzv4wqkrc-micha6.vercel.app',
        'https://mission-appointment-iota.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(requestResponseLogger);

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Mission Assignment System API",
}));

// Routes
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK" });
});
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/mission-type",missionType);
app.use("/api/missions", missionRoutes);
app.use("/api/departments", departmentRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;

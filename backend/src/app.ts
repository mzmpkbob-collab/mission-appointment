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
    origin: true,
    credentials: true,
    optionsSuccessStatus: 200
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

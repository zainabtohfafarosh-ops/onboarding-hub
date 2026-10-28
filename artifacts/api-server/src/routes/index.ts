import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hiresRouter from "./hires";
import tasksRouter from "./tasks";
import commsRouter from "./comms";
import dashboardRouter from "./dashboard";
import syncRouter from "./sync";
import aiRouter from "./ai";
import overdueActionsRouter from "./overdue-actions";
import orientationSchedulesRouter from "./orientation-schedules";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(hiresRouter);
router.use(tasksRouter);
router.use(commsRouter);
router.use(syncRouter);
router.use(aiRouter);
router.use(overdueActionsRouter);
router.use(orientationSchedulesRouter);

export default router;

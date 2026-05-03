import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tweetsRouter from "./tweets";
import attendanceRouter from "./attendance";
import partiesRouter from "./parties";
import politiciansRouter from "./politicians";
import eventsRouter from "./events";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/tweets", tweetsRouter);
router.use("/attendance", attendanceRouter);
router.use("/parties", partiesRouter);
router.use("/politicians", politiciansRouter);
router.use("/events", eventsRouter);
router.use("/dashboard", dashboardRouter);

export default router;

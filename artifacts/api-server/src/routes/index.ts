import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tweetsRouter from "./tweets";
import attendanceRouter from "./attendance";
import partiesRouter from "./parties";
import politiciansRouter from "./politicians";
import eventsRouter from "./events";
import dashboardRouter from "./dashboard";
import issuesRouter from "./issues";
import syncRouter from "./sync";
import searchRouter from "./search";
import pendingRouter from "./pending";
import schemesRouter from "./schemes";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/tweets", tweetsRouter);
router.use("/attendance", attendanceRouter);
router.use("/parties", partiesRouter);
router.use("/politicians", politiciansRouter);
router.use("/events", eventsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/issues", issuesRouter);
router.use("/sync", syncRouter);
router.use("/search", searchRouter);
router.use("/pending", pendingRouter);
router.use("/schemes", schemesRouter);

export default router;

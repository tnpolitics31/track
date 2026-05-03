import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tweetsRouter from "./tweets";
import attendanceRouter from "./attendance";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/tweets", tweetsRouter);
router.use("/attendance", attendanceRouter);

export default router;

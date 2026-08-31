import { Router, type IRouter } from "express";
import healthRouter from "./health";
import businessRouter from "./business";
import webhookRouter from "./webhooks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(businessRouter);
router.use(webhookRouter);

export default router;

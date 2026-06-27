import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import profileRouter from "./profile";
import couponsRouter from "./coupons";
import reviewsRouter from "./reviews";
import adminRouter from "./admin";
import authRouter from "./auth";
import settingsRouter from "./settings";
import policiesRouter from "./policies";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(settingsRouter);
router.use(policiesRouter);
router.use(adminRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(profileRouter);
router.use(couponsRouter);
router.use(reviewsRouter);

export default router;

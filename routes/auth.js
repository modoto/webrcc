const router = require("express").Router();
const ctrl = require("../controllers/AuthController");

router.get("/", ctrl.index);

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.post("/loginweb", ctrl.loginweb);
router.get("/logout", ctrl.logout);
module.exports = router;

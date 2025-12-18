const router = require("express").Router();
const ctrl = require("../controllers/AuthController");

router.get("/", ctrl.index);

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.post("/loginweb", ctrl.loginweb);
module.exports = router;

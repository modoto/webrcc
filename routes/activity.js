const express = require("express");
const router = express.Router();
const ActivityController = require("../controllers/ActivityController");
const { requireLogin } = require("../helpers/sessionHelper");

// HEADER
router.get("/", requireLogin, ActivityController.index);
router.get("/details/:id", requireLogin, ActivityController.details);

router.get("/operations", requireLogin, ActivityController.index); // mobile
router.get("/detailoperations/:id", ActivityController.details); // mobile

router.get("/create", requireLogin, ActivityController.createForm);
router.post("/create", requireLogin, ActivityController.create);

router.get("/edit/:id", requireLogin, ActivityController.editForm);
router.post("/edit/:id", requireLogin, ActivityController.update);

router.get("/delete/:id", requireLogin, ActivityController.delete);

// DETAIL
router.post("/detail/add", requireLogin, ActivityController.addDetail);
router.get("/detail/delete/:id", requireLogin, ActivityController.deleteDetail);

router.get("/getCamera/:id", requireLogin, ActivityController.getCamera);

// router.get("/detail/delete/:id", async (req, res) => {
//     const id = req.params.id;
//     const activityId = req.query.activity_id;  // <-- aman
//     Activity.addDetail
//     res.redirect("/activity/edit/" + activityId);
// });


module.exports = router;

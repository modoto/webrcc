const express = require("express");
const router = express.Router();
const ActivityController = require("../controllers/ActivityController");

// HEADER
router.get("/", ActivityController.index);
router.get("/details/:id", ActivityController.details);

router.get("/operations", ActivityController.index); // mobile
router.get("/detailoperations/:id", ActivityController.details); // mobile

router.get("/create", ActivityController.createForm);
router.post("/create", ActivityController.create);

router.get("/edit/:id", ActivityController.editForm);
router.post("/edit/:id", ActivityController.update);

router.get("/delete/:id", ActivityController.delete);

// DETAIL
router.post("/detail/add", ActivityController.addDetail);
router.get("/detail/delete/:id", ActivityController.deleteDetail);

router.get("/getCamera/:id", ActivityController.getCamera);

// router.get("/detail/delete/:id", async (req, res) => {
//     const id = req.params.id;
//     const activityId = req.query.activity_id;  // <-- aman
//     Activity.addDetail
//     res.redirect("/activity/edit/" + activityId);
// });


module.exports = router;

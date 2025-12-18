const express = require("express");
const router = express.Router();
const ActivityController = require("../controllers/ActivityController");

// HEADER
router.get("/", ActivityController.index);
router.get("/create", ActivityController.createForm);
router.post("/create", ActivityController.create);

router.get("/edit/:id", ActivityController.editForm);
router.post("/edit/:id", ActivityController.update);

router.get("/delete/:id", ActivityController.delete);

// DETAIL
router.post("/detail/add", ActivityController.addDetail);
router.get("/detail/delete/:id", ActivityController.deleteDetail);

// router.get("/detail/delete/:id", async (req, res) => {
//     const id = req.params.id;
//     const activityId = req.query.activity_id;  // <-- aman
//     Activity.addDetail
//     res.redirect("/activity/edit/" + activityId);
// });


module.exports = router;

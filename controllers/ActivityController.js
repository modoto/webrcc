const Activity = require('../models/ActivityModel');
const Unit = require('../models/UnitModel');
const { getUserIdSession, getUserSession, getTokenSession } = require('../helpers/sessionHelper');

// LIST HEADER
exports.index = async (req, res) => {
    const rows = await Activity.getAllHeader();
    res.render("activity/index", {title: "Activity List", rows });
};

exports.details = async (req, res) => {
    const row = await Activity.getHeaderByActivityId(req.params.id);
    const id = req.params.id
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    console.log(user_id);
    res.render("activity/details", {
      title: "Maps",
      layout: "layouts/layout_maps_details",
      id: id,
      type: "groups",
      user_id: user_id,
      username: user,
      token: token,
      row: row
    });
};

// CREATE HEADER FORM
exports.createForm = (req, res) => {
    res.render("activity/create", { title: "Add Activity" });
};

// CREATE HEADER POST
exports.create = async (req, res) => {
    await Activity.createHeader(req.body);
    res.redirect("/activity");
};

// EDIT HEADER
exports.editForm = async (req, res) => {
    const row = await Activity.getHeaderById(req.params.id);
    const details = await Activity.getDetailByActivity(row.activity_id);
    const units = await Unit.getAll();
    res.render("activity/edit", { title: "Edit Activity", row, details, units });
};

// UPDATE HEADER
exports.update = async (req, res) => {
    await Activity.updateHeader(req.params.id, req.body);
    res.redirect("/activity");
    
};

// DELETE HEADER
exports.delete = async (req, res) => {
    await Activity.deleteHeader(req.params.id);
    res.redirect("/activity");
};

///////////////////////////////////////////////////////
// DETAIL
///////////////////////////////////////////////////////

exports.addDetail = async (req, res) => {
    await Activity.addDetail(req.body);
    res.redirect("/activity/edit/" + req.body.header_id);
};

exports.deleteDetail = async (req, res) => {
    await Activity.deleteDetail(req.params.id);
    //res.redirect("back");
    res.redirect("/activity/edit/" + req.query.activity_id);

};

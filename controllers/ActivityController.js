require('dotenv').config(); // Loads variables from .env file into process.env
const Activity = require('../models/ActivityModel');
const Unit = require('../models/UnitModel');
const Bwcam = require("../models/BwcamModel");
const Mtcam = require('../models/MtcamModel');
const { getUserIdSession, getUserSession, getTokenSession, getRolesSession } = require('../helpers/sessionHelper');

// LIST HEADER
exports.index = async (req, res) => {
    const user_id = getUserIdSession(req);
    const username = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const rows = await Activity.getAllHeader();
    res.render("activity/index", {
        title: "Activity List",
        user_id: user_id,
        username: username,
        token: token,
        roles: roles,
        rows
    });
};

exports.details = async (req, res) => {
    const user_id = getUserIdSession(req);
    const username = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const SOCKET_URL = process.env.SOCKET_URL;
    const row = await Activity.getHeaderByActivityId(req.params.id);
    const id = req.params.id

    res.render("activity/details", {
        title: "Activity Details",
        layout: "layouts/layout_maps_details",
        id: id,
        type: "groups",
        user_id: user_id,
        username: username,
        token: token,
        roles: roles,
        socket_url: SOCKET_URL,
        row: row
    });
};

exports.getCamera = async (req, res) => {
    try {
        const row = await Activity.getHeaderByActivityId(req.params.id);
        const details = await Activity.getDetailsCamera(row.activity_id);

        res.json({ code: 200, status: true, message: 'Success', data: details });
    } catch (error) {
        console.error(error);
        res.json({ code: 500, status: false, message: error });
    }
}

// CREATE HEADER FORM
exports.createForm = (req, res) => {
    const user_id = getUserIdSession(req);
    const username = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    res.render("activity/create", {
        title: "Add Activity",
        user_id: user_id,
        username: username,
        token: token,
        roles: roles
    });
};

// CREATE HEADER POST
exports.create = async (req, res) => {
    await Activity.createHeader(req.body);
    res.redirect("/activity");
};

// EDIT HEADER
exports.editForm = async (req, res) => {
    const user_id = getUserIdSession(req);
    const username = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const row = await Activity.getHeaderById(req.params.id);
    const details = await Activity.getDetailByActivity(row.activity_id);
    const units = await Unit.getNotInActivity(row.activity_id);
    res.render("activity/edit", { 
        title: "Edit Activity", 
        user_id: user_id,
        username: username,
        token: token,
        roles: roles,
        details, 
        units,
        row, 
    });
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
    res.redirect("/activity/edit/" + req.body.header_id, );
};

exports.deleteDetail = async (req, res) => {
    await Activity.deleteDetail(req.params.id);
    //res.redirect("back");
    res.redirect("/activity/edit/" + req.query.activity_id);

};

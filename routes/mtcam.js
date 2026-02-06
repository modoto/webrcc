const express = require('express');
const router = express.Router();
const MtcamController = require('../controllers/MtcamController');
const { requireLogin } = require("../helpers/sessionHelper");

// LIST
router.get('/', requireLogin, MtcamController.index);

// CREATE
router.get('/create', requireLogin, MtcamController.createForm);
router.post('/create', requireLogin, MtcamController.create);

// EDIT
router.get('/edit/:id', requireLogin, MtcamController.editForm);
router.post('/edit/:id', requireLogin, MtcamController.update);

// DELETE
router.get('/delete/:id', requireLogin, MtcamController.delete);

module.exports = router;

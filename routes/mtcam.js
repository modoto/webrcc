const express = require('express');
const router = express.Router();
const MtcamController = require('../controllers/MtcamController');

// LIST
router.get('/', MtcamController.index);

// CREATE
router.get('/create', MtcamController.createForm);
router.post('/create', MtcamController.create);

// EDIT
router.get('/edit/:id', MtcamController.editForm);
router.post('/edit/:id', MtcamController.update);

// DELETE
router.get('/delete/:id', MtcamController.delete);

module.exports = router;

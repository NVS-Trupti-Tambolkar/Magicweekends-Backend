const express = require('express');
const router = express.Router();
const { insertGallery, updateGalleryById, getGalleryById, deleteGalleryById, getGalleries, deleteGalleryByFolder, updateGalleryByFolder, getGalleriesByTripId } = require('../controllers/GalleryController');
const upload = require('../config/multer');

router.post('/insertGallery', upload.array('images', 10), insertGallery);
router.put('/updateGalleryById', upload.array('images', 1), updateGalleryById);
router.put('/updateGalleryByFolder', upload.array('images', 10), updateGalleryByFolder);
router.get('/getGalleries', getGalleries);
router.get('/getGalleryById', getGalleryById);
router.get('/getGalleriesByTripId', getGalleriesByTripId);
router.delete('/deleteGalleryById', deleteGalleryById);
router.delete('/deleteGalleryByFolder', deleteGalleryByFolder);


module.exports = router;

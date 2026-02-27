const express = require('express');
const router = express.Router();
const galleryUpload = require('../middleware/galleryUpload');
const { insertGallery, updateGalleryById, deleteGalleryById, getGalleries, getGalleriesByTripId, deleteGalleryByFolder } = require('../controllers/GalleryController');


router.post('/insertGallery', galleryUpload.array('images',10), insertGallery);
router.put('/updateGalleryById', galleryUpload.array('images',10), updateGalleryById);
router.delete('/deleteGalleryById', deleteGalleryById);
router.get('/getGalleries', getGalleries);
router.get('/getGalleriesByTripId', getGalleriesByTripId);
router.delete('/deleteGalleryByFolder', deleteGalleryByFolder);

module.exports = router;
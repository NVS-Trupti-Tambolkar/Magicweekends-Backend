const express = require('express');
const router = express.Router();
const { insertGallery, updateGalleryById, getGalleryById, deleteGalleryById, getGalleries, deleteGalleryByFolder, updateGalleryByFolder, getGalleriesByTripId } = require('../controllers/GalleryController');
const galleryUpload = require('../middleware/galleryUpload');

router.post('/insertGallery', galleryUpload, insertGallery);
router.put('/updateGalleryById', galleryUpload, updateGalleryById);
router.put('/updateGalleryByFolder', galleryUpload, updateGalleryByFolder);
router.get('/getGalleries', getGalleries);
router.get('/getGalleryById', getGalleryById);
router.get('/getGalleriesByTripId', getGalleriesByTripId);
router.delete('/deleteGalleryById', deleteGalleryById);
router.delete('/deleteGalleryByFolder', deleteGalleryByFolder);


module.exports = router;

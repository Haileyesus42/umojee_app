import { Router } from 'express';
import { 
  enrollFace, 
  verifyFaces, 
  enrollPalm, 
  verifyPalmForUser,
  extractFaceEmbedding,
  checkFaceLiveness,
  extractPalmFeatures
} from '../../controller/client/biometricController';
import { Clientprotect } from '../../controller/client/authController';
import { uploadFaceImage, uploadPalmImage } from '../../middleware/biometricUpload';

const router = Router();

// Face biometric routes
router.post('/face/enroll', Clientprotect, uploadFaceImage, enrollFace);
router.post('/face/verify', Clientprotect, uploadFaceImage, verifyFaces);
router.post('/face/extract-embedding', Clientprotect, uploadFaceImage, extractFaceEmbedding);
router.post('/face/liveness', Clientprotect, uploadFaceImage, checkFaceLiveness);

// Palm biometric routes
router.post('/palm/enroll', Clientprotect, uploadPalmImage, enrollPalm);
router.post('/palm/verify', Clientprotect, uploadPalmImage, verifyPalmForUser);
router.post('/palm/extract-features', Clientprotect, uploadPalmImage, extractPalmFeatures);

export default router;
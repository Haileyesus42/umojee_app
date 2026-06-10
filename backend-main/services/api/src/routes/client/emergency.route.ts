import { Router } from 'express';
import { 
  addEmergencyContact,
  getEmergencyContacts,
  updateEmergencyContact,
  deleteEmergencyContact,
  triggerSOSAlert
} from '../../controller/client/emergencyController';
import { Clientprotect } from '../../controller/client/authController';

const router = Router();

// Emergency contact routes
router.post('/contacts', Clientprotect, addEmergencyContact);
router.get('/contacts', Clientprotect, getEmergencyContacts);
router.patch('/contacts/:contactId', Clientprotect, updateEmergencyContact);
router.delete('/contacts/:contactId', Clientprotect, deleteEmergencyContact);

// Emergency/SOS routes
router.post('/sos', Clientprotect, triggerSOSAlert);

export default router;
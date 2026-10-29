import { Router } from 'express';
const messageController = Router();

messageController.get('/health' , (req, res) => {
    res.status(200).json({ message: 'Message service is helathy' });
});


export default messageController;
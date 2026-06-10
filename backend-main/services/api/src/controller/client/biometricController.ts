import { Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import { RequestWithUser } from '../../types';

const AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000';

function getAuthHeader(req: RequestWithUser): string {
  return req.headers.authorization || '';
}

function appendImage(form: FormData, req: RequestWithUser, fieldName: string): void {
  if (req.file && Buffer.isBuffer(req.file.buffer)) {
    form.append(fieldName, req.file.buffer, {
      filename: req.file.originalname || 'image.jpg',
      contentType: req.file.mimetype || 'image/jpeg',
      knownLength: req.file.buffer.length,
    });
  }
}

export const extractFaceEmbedding = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.file || !Buffer.isBuffer(req.file.buffer)) {
      return res.status(400).json({ error: 'Invalid file upload' });
    }
    const form = new FormData();
    appendImage(form, req, 'image_data');
    
    const response = await axios.post(`${AI_SERVICE_URL}/v1/face/extract-embedding`, form, {
      headers: { ...form.getHeaders(), Authorization: getAuthHeader(req) },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.detail || error.message || 'Failed to extract face embedding',
    });
  }
};

export const verifyFaces = async (req: RequestWithUser, res: Response) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/v1/face/verify`, req.body, {
      headers: { 'Content-Type': 'application/json', Authorization: getAuthHeader(req) },
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.detail || error.message || 'Failed to verify faces',
    });
  }
};

export const checkFaceLiveness = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.file || !Buffer.isBuffer(req.file.buffer)) {
      return res.status(400).json({ error: 'Invalid file upload' });
    }
    const form = new FormData();
    appendImage(form, req, 'face_image');
    
    const response = await axios.post(`${AI_SERVICE_URL}/v1/face/liveness`, form, {
      headers: { ...form.getHeaders(), Authorization: getAuthHeader(req) },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.detail || error.message || 'Failed to check face liveness',
    });
  }
};

export const enrollFace = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.file || !Buffer.isBuffer(req.file.buffer)) {
      return res.status(400).json({ error: 'Invalid file upload' });
    }
    const form = new FormData();
    form.append('user_id', req.userId || '');
    form.append('name', req.body.name || 'Default User');
    appendImage(form, req, 'image_data');
    
    const response = await axios.post(`${AI_SERVICE_URL}/v1/face/enroll`, form, {
      headers: { ...form.getHeaders(), Authorization: getAuthHeader(req) },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.detail || error.message || 'Failed to enroll face',
    });
  }
};

export const enrollFaceFromBase64 = async (req: RequestWithUser, res: Response) => {
  try {
    const { image_data, name } = req.body;
    if (!image_data) {
      return res.status(400).json({ error: 'image_data is required' });
    }
    const base64 = image_data.includes(',') ? image_data.split(',')[1] : image_data;
    const buffer = Buffer.from(base64, 'base64');
    const form = new FormData();
    form.append('user_id', req.userId || '');
    form.append('name', name || 'Default User');
    form.append('image_data', buffer, {
      filename: 'face.jpg',
      contentType: 'image/jpeg',
      knownLength: buffer.length,
    });
    
    const response = await axios.post(`${AI_SERVICE_URL}/v1/face/enroll`, form, {
      headers: { ...form.getHeaders(), Authorization: getAuthHeader(req) },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.detail || error.message || 'Failed to enroll face',
    });
  }
};

export const verifyFaceForUser = async (req: RequestWithUser, res: Response) => {
  try {
    const imageBuffer = req.file?.buffer
      ? req.file.buffer
      : req.body.image_data
      ? Buffer.from(req.body.image_data.includes(',') ? req.body.image_data.split(',')[1] : req.body.image_data, 'base64')
      : null;
    if (!imageBuffer) {
      return res.status(400).json({ error: 'image_data is required' });
    }
    const form = new FormData();
    form.append('image_data', imageBuffer, {
      filename: 'face.jpg',
      contentType: 'image/jpeg',
      knownLength: imageBuffer.length,
    });
    
    const response = await axios.post(`${AI_SERVICE_URL}/v1/face/verify-me`, form, {
      headers: { ...form.getHeaders(), Authorization: getAuthHeader(req) },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.detail || error.message || 'Failed to verify face',
    });
  }
};

export const faceLogin = async (req: RequestWithUser, res: Response) => {
  try {
    const imageBuffer = req.file?.buffer
      ? req.file.buffer
      : req.body.image_data
      ? Buffer.from(req.body.image_data.includes(',') ? req.body.image_data.split(',')[1] : req.body.image_data, 'base64')
      : null;
    if (!imageBuffer) {
      return res.status(400).json({ error: 'image_data is required' });
    }
    const form = new FormData();
    form.append('image_data', imageBuffer, {
      filename: 'face.jpg',
      contentType: 'image/jpeg',
      knownLength: imageBuffer.length,
    });
    
    const response = await axios.post(`${AI_SERVICE_URL}/v1/face/login`, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.detail || error.message || 'Failed to login with face',
    });
  }
};

export const extractPalmFeatures = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.file || !Buffer.isBuffer(req.file.buffer)) {
      return res.status(400).json({ error: 'Invalid file upload' });
    }
    const form = new FormData();
    appendImage(form, req, 'image_data');
    
    const response = await axios.post(`${AI_SERVICE_URL}/v1/palm/extract-features`, form, {
      headers: { ...form.getHeaders(), Authorization: getAuthHeader(req) },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.detail || error.message || 'Failed to extract palm features',
    });
  }
};

export const verifyPalmForUser = async (req: RequestWithUser, res: Response) => {
  try {
    const imageBuffer = req.file?.buffer
      ? req.file.buffer
      : req.body.image_data
      ? Buffer.from(req.body.image_data.includes(',') ? req.body.image_data.split(',')[1] : req.body.image_data, 'base64')
      : null;
    if (!imageBuffer) {
      return res.status(400).json({ error: 'image_data is required' });
    }
    const form = new FormData();
    form.append('user_id', req.userId || '');
    form.append('image_data', imageBuffer, {
      filename: 'palm.jpg',
      contentType: 'image/jpeg',
      knownLength: imageBuffer.length,
    });
    
    const response = await axios.post(`${AI_SERVICE_URL}/v1/palm/verify`, form, {
      headers: { ...form.getHeaders(), Authorization: getAuthHeader(req) },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.detail || error.message || 'Failed to verify palm',
    });
  }
};

export const enrollPalm = async (req: RequestWithUser, res: Response) => {
  try {
    const imageBuffer = req.file?.buffer
      ? req.file.buffer
      : req.body.image_data
      ? Buffer.from(req.body.image_data.includes(',') ? req.body.image_data.split(',')[1] : req.body.image_data, 'base64')
      : null;
    if (!imageBuffer) {
      return res.status(400).json({ error: 'image_data is required' });
    }
    const form = new FormData();
    form.append('user_id', req.userId || '');
    form.append('name', req.body.name || 'Default User');
    form.append('image_data', imageBuffer, {
      filename: 'palm.jpg',
      contentType: 'image/jpeg',
      knownLength: imageBuffer.length,
    });
    
    const response = await axios.post(`${AI_SERVICE_URL}/v1/palm/enroll`, form, {
      headers: { ...form.getHeaders(), Authorization: getAuthHeader(req) },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.detail || error.message || 'Failed to enroll palm',
    });
  }
};

export const biometricHealthCheck = async (req: RequestWithUser, res: Response) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/v1/face/status`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: 'Biometric service unavailable' });
  }
};
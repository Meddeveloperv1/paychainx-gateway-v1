import express from 'express';
import { createToken, getToken, revokeToken } from './token-service.js';

const r = express.Router();

function auth(req:any,res:any,next:any){
  if(!req.headers['x-api-key']) return res.status(401).json({error:'unauthorized'});
  next();
}

r.post('/v1/tokens', auth, async (req,res)=>{
  try{
    const t = await createToken(req.body);
    res.status(201).json(t);
  }catch(e:any){
    res.status(500).json({error:e.message});
  }
});

r.get('/v1/tokens/:id', auth, async (req,res)=>{
  const t = await getToken(req.params.id);
  if(!t) return res.status(404).json({error:'not_found'});
  res.json(t);
});

r.post('/v1/tokens/:id/revoke', auth, async (req,res)=>{
  const t = await revokeToken(req.params.id);
  if(!t) return res.status(404).json({error:'not_found'});
  res.json(t);
});

export default r;

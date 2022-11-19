import express, { Express, Request, Response } from 'express';

import bodyParser from 'body-parser';
import cors from "cors";



const app: Express = express();
const port = process.env.PORT || 3000;

// middleware 
app.use(cors());
app.use(bodyParser.urlencoded({extended:true}))
app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
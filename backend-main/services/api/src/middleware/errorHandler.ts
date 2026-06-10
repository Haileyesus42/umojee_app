import { logEvents } from './logger';
import { Request, Response, NextFunction } from 'express';

// Define the errorHandler function with types for the parameters
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
    logEvents(`${err.name}\t${err.message}\t${req.method}\t${req.url}\t${req.headers.origin}`, 'errLog.log');
    console.log(err.stack);

    const status = res.statusCode ? res.statusCode : 500;
    res.status(status);
    res.json({ message: err.message });
};

// Export the errorHandler function
export default errorHandler;

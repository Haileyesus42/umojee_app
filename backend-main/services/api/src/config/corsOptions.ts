import allowedOrigins from './allowedOrigins';

// Define a type for the callback function used in the origin property
type OriginCallback = (err: Error | null, allow?: boolean) => void;

interface CorsOptions {
    origin: (origin: string | undefined, callback: OriginCallback) => void;
    credentials: boolean;
    optionsSuccessStatus: number;
}

const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};

export default corsOptions;

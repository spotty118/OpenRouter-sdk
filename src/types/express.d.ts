/**
 * Type declarations for Express and other packages
 */

declare module 'express' {
  import { Server } from 'http';
  
  export interface Request {
    app: {
      locals: {
        apiKey: string;
        [key: string]: any;
      };
    };
    [key: string]: any;
  }
  
  export interface Response {
    [key: string]: any;
  }
  
  export interface NextFunction {
    (err?: any): void;
  }
  
  export interface Application {
    listen(port: number, callback?: () => void): Server;
    use(path: string, handler: IRouter): Application;
    use(handler: RequestHandler): Application;
    use(errorHandler: ErrorRequestHandler): Application;
    [key: string]: any;
  }
  
  export type RequestHandler = (req: Request, res: Response, next: NextFunction) => any;
  export type ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction) => any;
  
  export interface IRouter {
    get(path: string, ...handlers: any[]): IRouter;
    post(path: string, ...handlers: any[]): IRouter;
    put(path: string, ...handlers: any[]): IRouter;
    delete(path: string, ...handlers: any[]): IRouter;
    [key: string]: any;
  }
  
  // Define the express namespace and function
  interface ExpressStatic {
    (): Application;
    Router(): IRouter;
    static: any;
    json: any;
    urlencoded: any;
    [key: string]: any;
  }
  
  const express: ExpressStatic;
  export default express;
}

declare module 'cors' {
  import { RequestHandler } from 'express';
  
  interface CorsOptions {
    origin?: boolean | string | string[] | RegExp | RegExp[] | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
  }
  
  function cors(options?: CorsOptions): RequestHandler;
  export default cors;
}

declare module 'helmet' {
  import { RequestHandler } from 'express';
  
  function helmet(): RequestHandler;
  export default helmet;
}

declare module 'multer' {
  import { RequestHandler } from 'express';
  
  interface StorageEngine {
    [key: string]: any;
  }
  
  interface MulterOptions {
    storage?: StorageEngine;
    limits?: {
      fileSize?: number;
      files?: number;
      [key: string]: any;
    };
    [key: string]: any;
  }
  
  interface Multer {
    single(fieldName: string): RequestHandler;
    array(fieldName: string, maxCount?: number): RequestHandler;
    fields(fields: Array<{ name: string; maxCount?: number }>): RequestHandler;
    none(): RequestHandler;
    [key: string]: any;
  }
  
  function multer(options?: MulterOptions): Multer;
  
  namespace multer {
    function memoryStorage(): StorageEngine;
    function diskStorage(options: {
      destination?: string | ((req: any, file: any, callback: (error: Error | null, destination: string) => void) => void);
      filename?: (req: any, file: any, callback: (error: Error | null, filename: string) => void) => void;
    }): StorageEngine;
  }
  
  export default multer;
}

declare module 'body-parser' {
  import { RequestHandler } from 'express';
  
  export function json(options?: {
    limit?: string | number;
    [key: string]: any;
  }): RequestHandler;
  
  export function urlencoded(options?: { extended?: boolean; limit?: string | number; [key: string]: any }): RequestHandler;
  export function raw(options?: { [key: string]: any }): RequestHandler;
}
/**
 * Type definitions for multer
 */
declare module 'multer' {
  import { Request } from 'express';

  namespace multer {
    interface File {
      /** Field name specified in the form */
      fieldname: string;
      /** Name of the file on the user's computer */
      originalname: string;
      /** Encoding type of the file */
      encoding: string;
      /** Mime type of the file */
      mimetype: string;
      /** Size of the file in bytes */
      size: number;
      /** The folder to which the file has been saved (DiskStorage) */
      destination?: string;
      /** The name of the file within the destination (DiskStorage) */
      filename?: string;
      /** Location of the uploaded file (DiskStorage) */
      path?: string;
      /** A Buffer of the entire file (MemoryStorage) */
      buffer?: Buffer;
    }

    interface Options {
      /** The destination directory for the uploaded files */
      dest?: string;
      /** The storage engine to use for uploaded files */
      storage?: any;
      /** An object specifying the size limits of the following optional properties */
      limits?: {
        /** Max field name size (in bytes) */
        fieldNameSize?: number;
        /** Max field value size (in bytes) */
        fieldSize?: number;
        /** Max number of non-file fields */
        fields?: number;
        /** Max file size (in bytes) */
        fileSize?: number;
        /** Max number of file fields */
        files?: number;
        /** Max number of parts (fields + files) */
        parts?: number;
        /** Max number of headers */
        headerPairs?: number;
      };
      /** Preserve the full path of files instead of just the base name */
      preservePath?: boolean;
      /** Function to control which files are uploaded and which are skipped */
      fileFilter?(
        req: Request,
        file: File,
        callback: (error: Error | null, acceptFile: boolean) => void
      ): void;
    }

    interface StorageEngine {
      _handleFile(
        req: Request,
        file: File,
        callback: (error?: any, info?: Partial<File>) => void
      ): void;
      _removeFile(
        req: Request,
        file: File,
        callback: (error: Error) => void
      ): void;
    }

    interface MemoryStorageOptions {}

    interface DiskStorageOptions {
      /** A function used to determine within which folder the uploaded files should be stored. Defaults to the system's default temporary directory. */
      destination?: string | ((req: Request, file: File, callback: (error: Error | null, destination: string) => void) => void);
      /** A function used to determine what the file should be named inside the folder. Defaults to a random name with no file extension. */
      filename?: (req: Request, file: File, callback: (error: Error | null, filename: string) => void) => void;
    }

    interface Instance {
      /** Accept a single file with the name fieldname. The single file will be stored in req.file. */
      single(fieldname: string): any;
      /** Accept an array of files, all with the name fieldname. The array of files will be stored in req.files. */
      array(fieldname: string, maxCount?: number): any;
      /** Accept a mix of files, specified by fields. An object with arrays of files will be stored in req.files. */
      fields(fields: { name: string; maxCount?: number }[]): any;
      /** Accepts all files that comes over the wire. An array of files will be stored in req.files. */
      any(): any;
      /** Accept only specified mime types, which can be either a string, an array, or a custom function */
      none(): any;
    }
  }

  interface Multer {
    (options?: multer.Options): multer.Instance;
    diskStorage(options: multer.DiskStorageOptions): multer.StorageEngine;
    memoryStorage(options?: multer.MemoryStorageOptions): multer.StorageEngine;
  }

  const multer: Multer;
  export = multer;
}
